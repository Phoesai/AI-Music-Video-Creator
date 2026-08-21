import React, { useState, useRef, useMemo } from 'react';
import {
  Music,
  User,
  Radio,
  Disc3,
  Image as ImageIcon,
  Sparkles,
  Check,
  Edit3,
  Info,
  Upload,
  Loader2,
  Wand2,
  Palette,
  FileImage,
  Search,
  Shuffle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { AudioMetadata, UserTouchedFields, CoverArtSelection } from '../types';
import {
  MOODS,
  MOOD_CATEGORIES,
  Mood,
  MoodCategoryId,
  getMoodById,
  generateGradientDataUrl,
  sanitizeCustomPrompt,
  buildImagePrompt,
} from '../moods';
import { GoogleGenAI } from '@google/genai';

interface StepMoodCoverArtProps {
  metadata: AudioMetadata | null;
  userTouched: UserTouchedFields;
  selectedMoodId: string;
  onSelectMood: (moodId: string) => void;
  coverArtSelection: CoverArtSelection;
  onSelectCoverArt: (selection: CoverArtSelection) => void;
  onFieldChange: (field: keyof AudioMetadata, value: string) => void;
  onError: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const StepMoodCoverArt: React.FC<StepMoodCoverArtProps> = ({
  metadata,
  userTouched,
  selectedMoodId,
  onSelectMood,
  coverArtSelection,
  onSelectCoverArt,
  onFieldChange,
  onError,
  log,
}) => {
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [copiedDescription, setCopiedDescription] = useState<boolean>(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMood = getMoodById(selectedMoodId);

  // Sanitization check on custom prompt
  const promptSanitizeResult = useMemo(() => {
    return sanitizeCustomPrompt(customPrompt);
  }, [customPrompt]);

  if (!metadata) {
    return (
      <div className="p-6 rounded-xl bg-[#0f172a]/60 border border-slate-800 text-center space-y-2">
        <Disc3 className="w-8 h-8 text-slate-600 mx-auto animate-spin-slow" />
        <p className="text-sm font-medium text-slate-400">
          Please select an audio track in Step 1 to auto-extract metadata & cover art.
        </p>
      </div>
    );
  }

  const handleInputChange = (field: keyof AudioMetadata, value: string) => {
    onFieldChange(field, value);
    log(`User edited ${field}: "${value}"`, 'info');
  };

  const handleMoodClick = (mood: Mood) => {
    onSelectMood(mood.id);
    log(`Selected visual mood: ${mood.labelEn} (${mood.labelMy})`, 'info');

    // If active cover art source is gradient, update gradient to match new mood palette
    if (coverArtSelection.source === 'gradient') {
      const gradientUrl = generateGradientDataUrl(mood);
      onSelectCoverArt({ source: 'gradient', url: gradientUrl });
    }
  };

  const handleSurpriseMe = () => {
    const available = MOODS;
    if (available.length === 0) return;
    const randomIndex = Math.floor(Math.random() * available.length);
    const chosenMood = available[randomIndex];
    handleMoodClick(chosenMood);
    log(`Surprise Me picked: ${chosenMood.labelEn} (${chosenMood.labelMy})`, 'success');
  };

  const toggleCategoryCollapse = (catId: MoodCategoryId) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
          throw new Error('Please select a valid PNG, JPG, or WEBP image file.');
        }

        const objectUrl = URL.createObjectURL(file);
        onSelectCoverArt({ source: 'upload', url: objectUrl });
        log(`Uploaded custom cover art: "${file.name}"`, 'success');
        e.target.value = '';
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to upload cover art image.';
      onError(errorMsg);
      log(`Cover art upload error: ${errorMsg}`, 'error');
    }
  };

  const handleGenerateAiCover = async () => {
    setIsGeneratingAi(true);
    log(`Generating AI cover art for "${currentMood.labelEn}" mood...`, 'info');

    try {
      const apiKey =
        process.env.GEMINI_API_KEY ||
        (import.meta as any).env?.VITE_GEMINI_API_KEY ||
        '';

      if (!apiKey) {
        throw new Error('Gemini API key is missing in environment variables (GEMINI_API_KEY)');
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildImagePrompt(currentMood, customPrompt);

      log(`Building copyright-safe prompt: "${prompt}"`, 'info');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      let generatedUrl: string | null = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            generatedUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!generatedUrl) {
        throw new Error('No image was returned from the Gemini AI model. Please try again.');
      }

      onSelectCoverArt({ source: 'ai', url: generatedUrl });
      log(`Successfully generated AI cover art for "${currentMood.labelEn}" mood!`, 'success');
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to generate AI cover art image.';
      onError(errorMsg);
      log(`AI image generation error: ${errorMsg}`, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSelectMp3Cover = () => {
    if (metadata.coverArtUrl) {
      onSelectCoverArt({ source: 'id3', url: metadata.coverArtUrl });
      log('Selected embedded MP3 ID3 cover art', 'info');
    }
  };

  const handleSelectGradientCover = () => {
    const gradientUrl = generateGradientDataUrl(currentMood);
    onSelectCoverArt({ source: 'gradient', url: gradientUrl });
    log('Selected mood gradient background fallback', 'info');
  };

  const handleCopyYouTubeDescription = () => {
    const text = `${metadata.title} - ${metadata.artist}
Channel: ${metadata.channelName}

Visuals: AI-generated original artwork. No stock footage, no third-party images, no copyrighted material used.
Mood: ${currentMood.labelEn}`;

    navigator.clipboard.writeText(text);
    setCopiedDescription(true);
    log('Copied YouTube description to clipboard', 'success');
    setTimeout(() => setCopiedDescription(false), 2500);
  };

  const getSourceBadge = (fieldKey: 'title' | 'artist' | 'album' | 'channelName') => {
    if (userTouched[fieldKey]) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <Edit3 className="w-2.5 h-2.5" />
          Edited
        </span>
      );
    }

    const source = metadata.sources[fieldKey] || 'fallback';
    if (source === 'id3') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          ID3 Tag
        </span>
      );
    }
    if (source === 'filename') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
          Filename
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        Default
      </span>
    );
  };

  const currentCoverUrl =
    coverArtSelection.url ||
    (coverArtSelection.source === 'gradient' ? generateGradientDataUrl(currentMood) : null);

  // Filter moods based on search query
  const query = searchQuery.trim().toLowerCase();
  const filteredMoods = MOODS.filter((m) => {
    if (!query) return true;
    return (
      m.labelEn.toLowerCase().includes(query) ||
      m.labelMy.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* 1. Mood Picker Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Visual Mood System (22 Moods)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a mood to set color grading, motion physics & visualizer energy
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Surprise me button */}
            <button
              type="button"
              onClick={handleSurpriseMe}
              id="mood-surprise-me-btn"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              Surprise Me
            </button>

            <span className="text-xs font-mono text-cyan-400 font-semibold bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-1 rounded-full capitalize shrink-0">
              {currentMood.labelEn} • {currentMood.labelMy}
            </span>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search moods by English or Burmese name (e.g., Heartbreak, အသဲကွဲ, Drill)..."
            id="mood-search-input"
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] border border-[#1e293b] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Mood Categories List */}
        <div className="space-y-5">
          {MOOD_CATEGORIES.map((cat) => {
            const categoryMoods = filteredMoods.filter((m) => m.category === cat.id);
            if (categoryMoods.length === 0) return null;

            const isCollapsed = !!collapsedCategories[cat.id];

            return (
              <div key={cat.id} className="space-y-2.5">
                {/* Collapsible Header */}
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapse(cat.id)}
                  id={`mood-category-header-${cat.id}`}
                  className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/80 border border-slate-800 text-left hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cyan-400" />
                    )}
                    <span className="text-xs font-bold text-slate-200 tracking-wider">
                      {cat.labelEn}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      ({cat.labelMy})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {categoryMoods.length} moods
                  </span>
                </button>

                {/* Grid of Mood Cards */}
                {!isCollapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {categoryMoods.map((mood) => {
                      const isSelected = mood.id === selectedMoodId;
                      return (
                        <button
                          key={mood.id}
                          type="button"
                          onClick={() => handleMoodClick(mood)}
                          id={`mood-card-${mood.id}`}
                          className={`relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-slate-900 shadow-lg border-2'
                              : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 hover:bg-[#162032]'
                          }`}
                          style={{
                            borderColor: isSelected ? mood.palette[0] : undefined,
                            boxShadow: isSelected ? `0 0 16px ${mood.palette[0]}44` : undefined,
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-2xl select-none">{mood.emoji}</span>
                            {isSelected && (
                              <span
                                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-950 shadow shrink-0"
                                style={{ backgroundColor: mood.palette[0] }}
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex flex-col leading-snug">
                              <span className="text-xs font-bold text-white truncate">
                                {mood.labelEn}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-400 truncate">
                                {mood.labelMy}
                              </span>
                            </div>

                            {/* 3-Dot Palette Swatch Preview */}
                            <div className="flex items-center gap-1.5 mt-2">
                              {mood.palette.map((color, idx) => (
                                <span
                                  key={idx}
                                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Cover Art Selection, AI Prompting & Copyright Safety */}
      <div className="p-5 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              Cover Art & Visualizer Background
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose an image source or generate custom artwork using Gemini AI
            </p>
          </div>

          {/* Source Badges / Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUploadImage}
              className="hidden"
              id="cover-art-file-input"
            />

            {/* From MP3 (if available) */}
            {metadata.coverArtUrl && (
              <button
                type="button"
                onClick={handleSelectMp3Cover}
                id="cover-tab-id3"
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  coverArtSelection.source === 'id3'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                }`}
              >
                <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                From MP3
              </button>
            )}

            {/* Generate with AI */}
            <button
              type="button"
              onClick={handleGenerateAiCover}
              disabled={isGeneratingAi}
              id="cover-tab-ai"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                coverArtSelection.source === 'ai'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
              } ${isGeneratingAi ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isGeneratingAi ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>Generate with AI</span>
            </button>

            {/* Upload Image */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              id="cover-tab-upload"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                coverArtSelection.source === 'upload'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Upload Image
            </button>

            {/* Mood Gradient */}
            <button
              type="button"
              onClick={handleSelectGradientCover}
              id="cover-tab-gradient"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                coverArtSelection.source === 'gradient'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Mood Gradient
            </button>
          </div>
        </div>

        {/* Uploaded Image Rights Banner */}
        {coverArtSelection.source === 'upload' && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Uploaded image - you are responsible for its rights. AI-generated covers are the safest option.
            </span>
          </div>
        )}

        {/* Custom Prompt Box with Sanitizer */}
        <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <label htmlFor="custom-prompt-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            Custom AI Visual Details (Optional)
          </label>
          <input
            id="custom-prompt-input"
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. wet rain, neon reflections, steam rising from food cart..."
            className="w-full px-3 py-2 bg-[#0a0f1e] border border-slate-800 focus:border-purple-400 focus:ring-1 focus:ring-purple-400/50 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none"
          />

          {/* Prompt Sanitizer Yellow Warning */}
          {promptSanitizeResult.warnings.length > 0 && (
            <div className="p-2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Removed {promptSanitizeResult.warnings.join(', ')} to keep your video copyright-safe.
              </span>
            </div>
          )}
        </div>

        {/* Preview & Copyright Safety Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cover Art Image Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-900 shadow-2xl group flex items-center justify-center">
              {isGeneratingAi ? (
                <div className="w-full h-full bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-3">
                  <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-purple-300">Generating Copyright-Safe Artwork...</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Gemini model painting {currentMood.labelEn} scene
                    </p>
                  </div>
                </div>
              ) : currentCoverUrl ? (
                <img
                  src={currentCoverUrl}
                  alt="Track Cover Art"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentMood.palette[0]}, ${currentMood.palette[1]}, ${currentMood.palette[2]})`,
                  }}
                >
                  <Disc3 className="w-12 h-12 text-white/80 mb-2 animate-spin-slow" />
                  <span className="text-xs font-semibold text-white drop-shadow">
                    {metadata.title}
                  </span>
                </div>
              )}

              {/* Source Badge overlay */}
              <div className="absolute top-2.5 left-2.5">
                {coverArtSelection.source === 'id3' && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-500/40 shadow backdrop-blur">
                    From MP3
                  </span>
                )}
                {coverArtSelection.source === 'ai' && (
                  <span className="text-[10px] font-mono font-bold bg-purple-950/90 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/40 shadow backdrop-blur flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Gemini AI
                  </span>
                )}
                {coverArtSelection.source === 'upload' && (
                  <span className="text-[10px] font-mono font-bold bg-cyan-950/90 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/40 shadow backdrop-blur">
                    Custom Upload
                  </span>
                )}
                {coverArtSelection.source === 'gradient' && (
                  <span className="text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40 shadow backdrop-blur">
                    Mood Gradient
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Copyright Safety Panel */}
          <div className="lg:col-span-7 space-y-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Copyright Safety Checklist
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>AI-generated original artwork - no stock footage</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No text or logos baked into the image</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No real-person likeness or celebrity reference</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>No trademarked brands</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Safe for YouTube monetization and TikTok Commercial Music Library</span>
                </div>
              </div>

              {/* Amber Note */}
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Visual safety only. You are responsible for the audio rights of your track. Use your own beat or one you are licensed to use, since YouTube Content ID matches audio, not images.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Song & Brand Details Form */}
      <div className="space-y-4 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Song & Brand Details
          </h4>

          {/* Copy YouTube Description Button */}
          <button
            type="button"
            onClick={handleCopyYouTubeDescription}
            id="copy-yt-desc-btn"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedDescription ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Description Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                <span>Copy YouTube Description</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Song Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-title" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                Song Title *
              </label>
              {getSourceBadge('title')}
            </div>
            <input
              id="input-title"
              type="text"
              value={metadata.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter song title..."
              required
              className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-medium transition-colors outline-none"
            />
          </div>

          {/* Artist Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-artist" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Artist Name *
              </label>
              {getSourceBadge('artist')}
            </div>
            <input
              id="input-artist"
              type="text"
              value={metadata.artist}
              onChange={(e) => handleInputChange('artist', e.target.value)}
              placeholder="Enter artist name..."
              required
              className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-medium transition-colors outline-none"
            />
          </div>

          {/* Channel / Brand Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-channel" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Channel / Brand Name *
              </label>
              {getSourceBadge('channelName')}
            </div>
            <input
              id="input-channel"
              type="text"
              value={metadata.channelName}
              onChange={(e) => handleInputChange('channelName', e.target.value)}
              placeholder="Myanmar Hip Hop Channel Reborn"
              required
              className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-medium transition-colors outline-none"
            />
          </div>

          {/* Album Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="input-album" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Disc3 className="w-3.5 h-3.5 text-cyan-400" />
                Album Name
              </label>
              {getSourceBadge('album')}
            </div>
            <input
              id="input-album"
              type="text"
              value={metadata.album}
              onChange={(e) => handleInputChange('album', e.target.value)}
              placeholder="e.g. Single"
              className="w-full px-3.5 py-2.5 bg-[#0f172a] border border-[#1e293b] focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 rounded-xl text-sm text-slate-100 placeholder-slate-500 font-medium transition-colors outline-none"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2 font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Editing any field flags it as user-customized and protects it from auto-overwriting.</span>
        </div>
      </div>
    </div>
  );
};
