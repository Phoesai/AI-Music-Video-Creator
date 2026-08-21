import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tv,
  Smartphone,
  RefreshCw,
  Eye,
  CheckCircle2,
  Play,
  Pause,
  Sliders,
  Volume2,
  VolumeX,
  Activity,
  BarChart3,
  Loader2,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { AudioTrackInfo, AudioMetadata, CoverArtSelection } from '../types';
import { getMoodById, generateGradientDataUrl } from '../moods';
import { drawFrame, RenderState, VisualizerStyle } from '../renderer/drawFrame';
import { loadCanvasImage } from '../utils/imageLoader';
import { ensureFontsLoaded } from '../utils/fonts';
import { AudioAnalysis, analyzeAudioFile } from '../utils/audioAnalyzer';

export type AspectRatio = '16:9' | '9:16';

interface StepPreviewProps {
  track: AudioTrackInfo | null;
  metadata: AudioMetadata | null;
  selectedMoodId: string;
  coverArtSelection: CoverArtSelection;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onError: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Module-level counter for loop detector (Rule 7)
const analysisCallCounts: Record<string, number> = {};

export const StepPreview: React.FC<StepPreviewProps> = ({
  track,
  metadata,
  selectedMoodId,
  coverArtSelection,
  aspectRatio,
  onAspectRatioChange,
  onError,
  log,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [isFontReady, setIsFontReady] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const timeRef = useRef<number>(0);

  const [motionIntensity, setMotionIntensity] = useState<number>(() => {
    const saved = localStorage.getItem('mv_motion_intensity');
    return saved ? parseInt(saved, 10) : 60;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Audio reactivity & Analysis states
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>('Bars');

  const currentMood = getMoodById(selectedMoodId);
  const duration = metadata?.duration || 180;

  // File identity key for run-once guard (Rule 3)
  const audioFile = track?.file;
  const fileKey = audioFile
    ? `${audioFile.name}|${audioFile.size}|${audioFile.lastModified}`
    : null;
  const analyzedKeyRef = useRef<string | null>(null);

  const handleMotionIntensityChange = (val: number) => {
    setMotionIntensity(val);
    try {
      localStorage.setItem('mv_motion_intensity', val.toString());
    } catch {}
  };

  // Thumbnail PNG Download Handler at t=2s
  const handleDownloadThumbnail = async () => {
    try {
      log('Generating 1080p full-resolution thumbnail at t=2.0s...', 'info');
      await ensureFontsLoaded();

      const width = aspectRatio === '16:9' ? 1920 : 1080;
      const height = aspectRatio === '16:9' ? 1080 : 1920;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;

      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context for thumbnail.');

      const targetUrl = coverArtSelection.url || generateGradientDataUrl(currentMood);
      const coverImg = await loadCanvasImage(targetUrl);

      const thumbnailTime = 2.0;
      const state: RenderState = {
        cover: coverImg,
        mood: currentMood,
        title: metadata?.title || 'Song Title',
        artist: metadata?.artist || 'Artist Name',
        channel: metadata?.channelName || 'CHANNEL NAME',
        duration: duration,
        getEnergy: audioAnalysis ? audioAnalysis.getEnergy : undefined,
        energy: audioAnalysis ? audioAnalysis.getEnergy(thumbnailTime) : null,
        motionIntensity: motionIntensity,
        visualizerStyle: visualizerStyle,
      };

      drawFrame(ctx, state, thumbnailTime);

      const dataUrl = offscreenCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      const filename = `${metadata?.artist || 'Artist'} - ${metadata?.title || 'Song'} (Thumbnail).png`;
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      log(`Full resolution 1080p thumbnail downloaded: "${filename}"`, 'success');
    } catch (err: any) {
      const msg = err?.message || 'Failed to export thumbnail PNG.';
      onError(msg);
      log(`Thumbnail export error: ${msg}`, 'error');
    }
  };

  // 1. Ensure fonts loaded
  useEffect(() => {
    ensureFontsLoaded().then(() => setIsFontReady(true));
  }, []);

  // 2. RUN-ONCE GUARD FOR AUDIO ANALYSIS (Rule 3 & Rule 7)
  useEffect(() => {
    if (!fileKey) {
      analyzedKeyRef.current = null;
      setAudioAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    if (analyzedKeyRef.current === fileKey) return;

    analysisCallCounts[fileKey] = (analysisCallCounts[fileKey] || 0) + 1;
    if (analysisCallCounts[fileKey] > 3) {
      log('Loop detected - analysis aborted', 'error');
      return;
    }

    analyzedKeyRef.current = fileKey;
    let cancelled = false;

    if (audioFile) {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      log(`Analyzing audio timeline for "${audioFile.name}"...`, 'info');

      analyzeAudioFile(audioFile, (prog) => {
        if (!cancelled) setAnalysisProgress(prog);
      })
        .then((analysis) => {
          if (!cancelled) {
            setAudioAnalysis(analysis);
            setIsAnalyzing(false);
            log(
              `Audio timeline precomputed (${analysis.totalFrames} frames). Estimated tempo: ${
                analysis.bpm ? `${analysis.bpm} BPM` : 'low confidence (--)'
              }`,
              'success'
            );
          }
        })
        .catch((err: any) => {
          if (!cancelled) {
            setIsAnalyzing(false);
            setAudioAnalysis(null);
            const msg = err?.message || 'Error analyzing audio file';
            onError(msg);
            log(`Audio analysis error: ${msg}`, 'error');
          }
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  // 3. Load cover image
  const coverUrl = coverArtSelection.url || generateGradientDataUrl(currentMood);
  useEffect(() => {
    let isSubscribed = true;

    loadCanvasImage(coverUrl).then((img) => {
      if (isSubscribed) setLoadedImage(img);
    });

    return () => {
      isSubscribed = false;
    };
  }, [coverUrl]);

  // 4. Audio setup & sync
  const trackObjectUrl = track?.objectUrl;
  useEffect(() => {
    if (trackObjectUrl) {
      const audio = new Audio(trackObjectUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        timeRef.current = 0;
        audio.currentTime = 0;
      };

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    } else {
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      timeRef.current = 0;
    }
  }, [trackObjectUrl]);

  // Ref holding render parameters for drawFrame to avoid state updates inside rAF loop (Rule 5)
  const renderParamsRef = useRef({
    loadedImage,
    currentMood,
    title: metadata?.title || 'Song Title',
    artist: metadata?.artist || 'Artist Name',
    channel: metadata?.channelName || 'CHANNEL NAME',
    duration,
    audioAnalysis,
    motionIntensity,
    visualizerStyle,
    aspectRatio,
  });

  renderParamsRef.current = {
    loadedImage,
    currentMood,
    title: metadata?.title || 'Song Title',
    artist: metadata?.artist || 'Artist Name',
    channel: metadata?.channelName || 'CHANNEL NAME',
    duration,
    audioAnalysis,
    motionIntensity,
    visualizerStyle,
    aspectRatio,
  };

  // 5. Render frame at time t
  const drawAtTime = useCallback(
    (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const params = renderParamsRef.current;
      const width = params.aspectRatio === '16:9' ? 1920 : 1080;
      const height = params.aspectRatio === '16:9' ? 1080 : 1920;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const state: RenderState = {
        cover: params.loadedImage,
        mood: params.currentMood,
        title: params.title,
        artist: params.artist,
        channel: params.channel,
        duration: params.duration,
        getEnergy: params.audioAnalysis ? params.audioAnalysis.getEnergy : undefined,
        energy: params.audioAnalysis ? params.audioAnalysis.getEnergy(t) : null,
        motionIntensity: params.motionIntensity,
        visualizerStyle: params.visualizerStyle,
      };

      try {
        drawFrame(ctx, state, t);
      } catch (err: any) {
        onError(err?.message || 'Error rendering canvas frame');
      }
    },
    [onError]
  );

  // 6. requestAnimationFrame loop when playing (NO setState inside rAF loop - Rule 5)
  useEffect(() => {
    if (!isPlaying) {
      drawAtTime(timeRef.current);
      return;
    }

    const tick = () => {
      let t = timeRef.current;
      if (audioRef.current) {
        t = audioRef.current.currentTime;
        timeRef.current = t;
      } else {
        t = timeRef.current + 0.033;
        if (t >= duration) {
          setIsPlaying(false);
          timeRef.current = 0;
          setCurrentTime(0);
          return;
        }
        timeRef.current = t;
      }

      drawAtTime(t);
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, drawAtTime, duration]);

  // Separate interval for updating scrubber UI state at most 10 times/sec (Rule 5)
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      } else {
        setCurrentTime(timeRef.current);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Keyboard Shortcuts: Space toggle play/pause, Left/Right arrow scrub 5s
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (audioRef.current) {
          if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        } else {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(0, timeRef.current - 5);
        timeRef.current = next;
        setCurrentTime(next);
        if (audioRef.current) audioRef.current.currentTime = next;
        drawAtTime(next);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(duration, timeRef.current + 5);
        timeRef.current = next;
        setCurrentTime(next);
        if (audioRef.current) audioRef.current.currentTime = next;
        drawAtTime(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, drawAtTime]);

  // Draw frame on static state change when paused
  useEffect(() => {
    if (!isPlaying) {
      drawAtTime(currentTime);
    }
  }, [drawAtTime, isFontReady, isPlaying, currentTime, fileKey, visualizerStyle, motionIntensity, aspectRatio]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) {
      setIsPlaying((prev) => !prev);
      log(`Toggled motion preview ${!isPlaying ? 'PLAY' : 'PAUSE'}`, 'info');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      log('Paused audio & motion preview', 'info');
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          log('Playing audio & animated canvas preview', 'info');
        })
        .catch((err) => {
          onError(`Failed to play audio: ${err.message}`);
        });
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    timeRef.current = newTime;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    drawAtTime(newTime);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleRatioToggle = (ratio: AspectRatio) => {
    onAspectRatioChange(ratio);
    log(`Switched aspect ratio to ${ratio}`, 'info');
  };

  if (!metadata) {
    return (
      <div className="p-8 rounded-2xl bg-[#0f172a]/60 border border-slate-800 text-center space-y-3">
        <Eye className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-sm font-medium text-slate-400">
          Upload an audio track in Step 1 to unlock live canvas preview.
        </p>
      </div>
    );
  }

  const canvasWidth = aspectRatio === '16:9' ? 1920 : 1080;
  const canvasHeight = aspectRatio === '16:9' ? 1080 : 1920;

  return (
    <div className="space-y-6">
      {/* Aspect Ratio, Visualizer Style & Motion Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#0f172a] border border-[#1e293b]">
        {/* Aspect Ratio Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              Aspect Ratio
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {canvasWidth} x {canvasHeight} px
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              type="button"
              onClick={() => handleRatioToggle('16:9')}
              id="aspect-ratio-16-9"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                aspectRatio === '16:9'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>

            <button
              type="button"
              onClick={() => handleRatioToggle('9:16')}
              id="aspect-ratio-9-16"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                aspectRatio === '9:16'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
          </div>
        </div>

        {/* Visualizer Style Dropdown */}
        <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
          <BarChart3 className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex flex-col space-y-0.5">
            <label htmlFor="select-visualizer-style" className="text-[10px] font-mono text-slate-400 font-bold uppercase">
              Visualizer Style
            </label>
            <select
              id="select-visualizer-style"
              value={visualizerStyle}
              onChange={(e) => setVisualizerStyle(e.target.value as VisualizerStyle)}
              className="bg-slate-800 text-slate-100 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer focus:outline-none focus:border-cyan-400"
            >
              <option value="Bars">Bars (64 Spectrum)</option>
              <option value="Waveline">Waveline</option>
              <option value="None">None (Disabled)</option>
            </select>
          </div>
        </div>

        {/* Motion Intensity Slider */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
          <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="flex-1 min-w-[130px] space-y-1">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span className="text-slate-300 font-bold uppercase tracking-wider">
                Motion Intensity
              </span>
              <span className="text-cyan-400 font-bold">{motionIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={motionIntensity}
              onChange={(e) => handleMotionIntensityChange(parseInt(e.target.value, 10))}
              id="input-motion-intensity"
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Live Preview Canvas Container */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0a0f1e] border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
        {/* Mood Ambient Glow */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none blur-3xl transition-all duration-700"
          style={{
            background: `radial-gradient(circle at center, ${currentMood.palette[0]} 0%, transparent 70%)`,
          }}
        />

        {/* Canvas Display */}
        <div
          className={`relative w-full rounded-xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-slate-950 transition-all duration-300 ${
            aspectRatio === '16:9' ? 'max-w-3xl aspect-video' : 'max-w-xs aspect-[9/16]'
          }`}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain block"
            style={{ imageRendering: 'auto' }}
          />

          {/* Analyzing Audio Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-10 p-4 text-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <span className="text-sm font-bold text-slate-100 block">
                  Analyzing audio...
                </span>
                <span className="text-xs font-mono text-cyan-400 font-semibold block">
                  {Math.round(analysisProgress * 100)}%
                </span>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{ width: `${Math.round(analysisProgress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="bg-slate-950/85 backdrop-blur-md text-slate-200 border border-slate-700 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                }`}
              />
              {isPlaying ? 'Animated Motion' : 'Paused Frame'} ({aspectRatio})
            </span>
          </div>
        </div>

        {/* Preview Transport Bar */}
        <div className="w-full max-w-3xl mt-5 p-3.5 rounded-xl bg-[#0f172a] border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            id="btn-play-pause-preview"
            className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
          </button>

          {/* Scrubber Timeline Slider */}
          <div className="flex-1 w-full space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.05"
              value={currentTime}
              onChange={handleScrub}
              id="input-scrubber"
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
          </div>

          {/* Mute toggle button if audio track exists */}
          {track && (
            <button
              type="button"
              onClick={toggleMute}
              id="btn-mute-audio"
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer shrink-0"
              title={isMuted ? 'Unmute preview audio' : 'Mute preview audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
            </button>
          )}

          {/* Download Thumbnail PNG Button */}
          <button
            type="button"
            onClick={handleDownloadThumbnail}
            id="btn-download-thumbnail-png"
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            title="Export 1080p full-resolution thumbnail frame at t=2s"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Thumbnail (PNG)</span>
            <span className="sm:hidden">PNG</span>
          </button>
        </div>

        {/* Engine Diagnostics */}
        <div className="w-full max-w-3xl mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs font-mono text-slate-400">
          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase">Tempo (BPM)</span>
            <span className="font-bold text-cyan-400">
              {audioAnalysis?.bpm ? `${audioAnalysis.bpm} BPM` : '--'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase">Ken Burns</span>
            <span className="font-bold text-cyan-300 capitalize">
              {currentMood.motion.type}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase">Beat Pulse</span>
            <span className="font-bold text-emerald-400">
              Hero + Vignette
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-slate-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 block uppercase">Film Grain</span>
            <span className="font-bold text-purple-300">
              Shimmering Seed
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0f172a] border border-slate-800 space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-500 block uppercase">Visualizer</span>
            <span className="font-bold text-amber-300">
              {visualizerStyle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
