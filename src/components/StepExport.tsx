import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Download,
  AlertTriangle,
  Play,
  Square,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Film,
  Loader2,
} from 'lucide-react';
import { AudioTrackInfo, AudioMetadata, CoverArtSelection } from '../types';
import { AspectRatio } from './StepPreview';
import { VisualizerStyle, drawFrame, RenderState } from '../renderer/drawFrame';
import { getMoodById, generateGradientDataUrl } from '../moods';
import { loadCanvasImage } from '../utils/imageLoader';
import { ensureFontsLoaded } from '../utils/fonts';
import { analyzeAudioFile, AudioAnalysis } from '../utils/audioAnalyzer';

interface StepExportProps {
  track: AudioTrackInfo | null;
  metadata: AudioMetadata | null;
  selectedMoodId: string;
  coverArtSelection: CoverArtSelection;
  aspectRatio: AspectRatio;
  visualizerStyle?: VisualizerStyle;
  motionIntensity?: number;
  onError: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function getSupportedMimeType(): string | undefined {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

export const StepExport: React.FC<StepExportProps> = ({
  track,
  metadata,
  selectedMoodId,
  coverArtSelection,
  aspectRatio,
  visualizerStyle: propVisStyle = 'Bars' as VisualizerStyle,
  motionIntensity = 60,
  onError,
  log,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPreparing, setIsPreparing] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportVisStyle, setExportVisStyle] = useState<VisualizerStyle>(propVisStyle);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioCtxRef = useRef<AudioContext | null>(null);
  const activeMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const activeAnimFrameRef = useRef<number | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const duration = metadata?.duration || 0;
  const currentMood = getMoodById(selectedMoodId);

  // Export Validation Rules
  const missingRequirements: string[] = [];
  if (!track) missingRequirements.push('Audio track uploaded');
  if (!metadata || metadata.duration <= 0) missingRequirements.push('Valid audio track duration (> 0s)');
  if (!metadata || !metadata.title.trim()) missingRequirements.push('Song title filled out');
  if (!coverArtSelection || !coverArtSelection.url) missingRequirements.push('Cover art selected or generated');
  if (typeof MediaRecorder === 'undefined') missingRequirements.push('Browser MediaRecorder support');

  const isExportReady = missingRequirements.length === 0;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelExport();
    };
  }, []);

  const cancelExport = () => {
    if (activeAnimFrameRef.current) {
      cancelAnimationFrame(activeAnimFrameRef.current);
      activeAnimFrameRef.current = null;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    if (activeMediaRecorderRef.current && activeMediaRecorderRef.current.state !== 'inactive') {
      try {
        activeMediaRecorderRef.current.stop();
      } catch {}
      activeMediaRecorderRef.current = null;
    }

    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }

    if (activeAudioCtxRef.current) {
      activeAudioCtxRef.current.close().catch(() => {});
      activeAudioCtxRef.current = null;
    }

    setIsExporting(false);
    setIsPreparing(false);
  };

  const handleStartExport = async () => {
    if (!track || !metadata) {
      onError('Please upload an audio track before exporting.');
      return;
    }

    setExportError(null);
    setDownloadUrl(null);
    setIsPreparing(true);
    setExportProgress(0);
    setCurrentTime(0);

    log('Initializing realtime WebM export engine...', 'info');

    try {
      // 1. Offscreen Canvas setup
      const width = aspectRatio === '16:9' ? 1920 : 1080;
      const height = aspectRatio === '16:9' ? 1080 : 1920;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = width;
      offscreenCanvas.height = height;

      const ctx = offscreenCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not create 2D rendering context for export canvas.');
      }

      // 2. Pre-load assets & analyze audio
      await ensureFontsLoaded();

      const targetUrl = coverArtSelection.url || generateGradientDataUrl(currentMood);
      const loadedCover = await loadCanvasImage(targetUrl);

      log('Precomputing audio energy timeline for export reactivity...', 'info');
      const audioAnalysis: AudioAnalysis = await analyzeAudioFile(track.file);

      // 3. Audio Context & Routing
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      activeAudioCtxRef.current = audioCtx;

      const audio = new Audio(track.objectUrl);
      activeAudioRef.current = audio;

      const source = audioCtx.createMediaElementSource(audio);
      const dest = audioCtx.createMediaStreamDestination();

      // Silent gain node to user speakers so recording captures audio without doubling user playback
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;

      source.connect(dest);
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // 4. Video + Audio Stream capture
      const canvasStream = offscreenCanvas.captureStream(30);
      activeStreamRef.current = canvasStream;

      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }

      // 5. Select MimeType & MediaRecorder setup
      const mimeType = getSupportedMimeType();
      log(`Selected MediaRecorder mimeType: ${mimeType || 'default'}`, 'info');

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(canvasStream, recorderOptions);
      activeMediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const artistName = metadata.artist || 'Artist Name';
      const songTitle = metadata.title || 'Song Title';
      const filename = `${artistName} - ${songTitle} (Music Video).webm`;

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(finalBlob);

        setDownloadUrl(url);
        setDownloadFilename(filename);
        setIsExporting(false);
        setIsPreparing(false);

        log(`Video export complete! File size: ${(finalBlob.size / 1024 / 1024).toFixed(2)} MB`, 'success');

        // Automatically trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      // 6. Start Recording & Audio Playback
      setIsPreparing(false);
      setIsExporting(true);

      mediaRecorder.start(1000);
      audio.currentTime = 0;
      await audio.play();

      log('Realtime recording started. Rendering frames at 30 FPS...', 'info');

      // 7. Render Clock Loop
      const state: RenderState = {
        cover: loadedCover,
        mood: currentMood,
        title: metadata.title || 'Song Title',
        artist: metadata.artist || 'Artist Name',
        channel: metadata.channelName || 'CHANNEL NAME',
        duration: duration,
        getEnergy: audioAnalysis.getEnergy,
        motionIntensity: motionIntensity,
        visualizerStyle: exportVisStyle,
      };

      let lastProgressUpdate = 0;

      const tick = () => {
        if (!audioRefCurrentIsActive(audio)) return;

        const t = audio.currentTime;
        const now = Date.now();
        if (now - lastProgressUpdate > 100) {
          lastProgressUpdate = now;
          setCurrentTime(t);
          const pct = Math.min(100, (t / duration) * 100);
          setExportProgress(pct);
        }

        state.energy = audioAnalysis.getEnergy(t);
        drawFrame(ctx, state, t);

        if (!audio.paused && !audio.ended && t < duration) {
          activeAnimFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Finished track recording
          setCurrentTime(duration);
          setExportProgress(100);
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      };

      activeAnimFrameRef.current = requestAnimationFrame(tick);

      audio.onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };
    } catch (err: any) {
      const msg = err?.message || 'Realtime video export failed.';
      setExportError(msg);
      onError(msg);
      log(`Export failed: ${msg}`, 'error');
      cancelExport();
    }
  };

  function audioRefCurrentIsActive(audio: HTMLAudioElement): boolean {
    return activeAudioRef.current === audio;
  }

  const handleCancel = () => {
    cancelExport();
    log('Export cancelled by user', 'warn');
  };

  if (!track || !metadata) {
    return (
      <div className="bg-[#161c2d] border border-slate-800 rounded-2xl p-6 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-500 shrink-0">
              4
            </div>
            <div>
              <span className="text-base font-semibold text-slate-200 block">Export & MP4/WebM Video</span>
              <span className="text-xs text-slate-400 font-mono">
                Realtime WebCodecs + WebAudio rendering engine
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Upload track in Step 1 to unlock
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="step-card-4"
      className="bg-[#161c2d] border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(34,211,238,0.08)] rounded-2xl p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20 shrink-0">
            4
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Export Music Video</span>
              <Film className="w-4 h-4 text-cyan-400" />
            </h3>
            <p className="text-xs text-slate-400">
              High-definition 1080p realtime render with VP9 / WebM encoding & audio sync.
            </p>
          </div>
        </div>

        {downloadUrl && (
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Ready for Download
          </span>
        )}
      </div>

      {/* Realtime Notice Warning Banner & Mobile Advice */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-200/90 leading-relaxed">
          <span className="font-bold text-amber-300 block">
            Notice: Realtime Export Performance
          </span>
          <p>
            Realtime video export runs 100% in your browser using Canvas & MediaRecorder. Export works best on <strong>Desktop Google Chrome or Microsoft Edge</strong>. Please keep this browser tab active and in the foreground while recording for smooth 30 FPS encoding.
          </p>
        </div>
      </div>

      {/* Validation Checklist if requirements missing */}
      {!isExportReady && !isExporting && !isPreparing && (
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Prerequisites Required Before Export
          </span>
          <ul className="space-y-1 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              {track ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={track ? 'text-slate-300' : 'text-amber-200 font-semibold'}>Audio track uploaded (MP3, WAV, M4A)</span>
            </li>
            <li className="flex items-center gap-2">
              {metadata && metadata.duration > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={metadata && metadata.duration > 0 ? 'text-slate-300' : 'text-amber-200 font-semibold'}>Valid audio duration (&gt; 0s)</span>
            </li>
            <li className="flex items-center gap-2">
              {metadata && metadata.title.trim().length > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={metadata && metadata.title.trim().length > 0 ? 'text-slate-300' : 'text-amber-200 font-semibold'}>Non-empty song title</span>
            </li>
            <li className="flex items-center gap-2">
              {coverArtSelection && coverArtSelection.url ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={coverArtSelection && coverArtSelection.url ? 'text-slate-300' : 'text-amber-200 font-semibold'}>Cover art image selected</span>
            </li>
            <li className="flex items-center gap-2">
              {typeof MediaRecorder !== 'undefined' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
              <span className={typeof MediaRecorder !== 'undefined' ? 'text-slate-300' : 'text-amber-200 font-semibold'}>Browser MediaRecorder API support</span>
            </li>
          </ul>
        </div>
      )}

      {/* Error Message */}
      {exportError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-3">
          <span>{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-red-400 hover:text-red-200 font-bold underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress & Active Export Dashboard */}
      {(isPreparing || isExporting) && (
        <div className="p-5 rounded-2xl bg-[#0a0f1e] border border-cyan-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-sm font-bold text-slate-100">
                {isPreparing ? 'Preparing canvas & audio timeline...' : 'Rendering & Recording Music Video...'}
              </span>
            </div>
            <span className="text-sm font-mono font-bold text-cyan-400">
              {Math.round(exportProgress)}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-200 shadow-md shadow-cyan-500/30"
              style={{ width: `${Math.max(1, exportProgress)}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span>
                Format: <strong className="text-slate-200">{aspectRatio} (1080p)</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              id="btn-cancel-export"
              className="px-4 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-red-400" />
              <span>Cancel Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons & Success Download Card */}
      <div className="space-y-4">
        {downloadUrl && (
          <div className="space-y-3">
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-sm font-bold text-emerald-300 flex items-center justify-center sm:justify-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Video Export Ready!
                </span>
                <span className="text-xs font-mono text-slate-300 block truncate max-w-md">
                  {downloadFilename}
                </span>
              </div>

              <a
                href={downloadUrl}
                download={downloadFilename || 'Music Video.webm'}
                id="btn-download-exported-video"
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download Video (.webm)</span>
              </a>
            </div>

            {/* YouTube Description Copy Helper */}
            {metadata && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-300 space-y-0.5 text-center sm:text-left">
                  <span className="font-bold text-slate-200 block">Copy YouTube Video Description</span>
                  <span className="text-slate-400 text-[11px] font-mono block">
                    {metadata.title} - {metadata.artist} • Channel: {metadata.channelName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `${metadata.title} - ${metadata.artist}\nChannel: ${metadata.channelName}\n\nVisuals: AI-generated original artwork. No stock footage, no third-party images, no copyrighted material used.\nMood: ${currentMood.labelEn}`;
                    navigator.clipboard.writeText(text);
                    log('Copied YouTube description to clipboard', 'success');
                  }}
                  id="btn-copy-yt-description-export"
                  className="px-3.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Copy YouTube Description</span>
                </button>
              </div>
            )}
          </div>
        )}

        {!isExporting && !isPreparing && (
          <button
            type="button"
            onClick={handleStartExport}
            disabled={!isExportReady}
            id="btn-start-export"
            title={
              isExportReady
                ? 'Click to start rendering and recording video'
                : `Export disabled - missing requirements: ${missingRequirements.join(', ')}`
            }
            className={`w-full py-4 rounded-xl font-extrabold text-base tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all ${
              isExportReady
                ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:brightness-110 text-slate-950 cursor-pointer active:scale-[0.99] shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-80'
            }`}
          >
            {isExportReady ? (
              <Video className="w-5 h-5 fill-slate-950" />
            ) : (
              <Lock className="w-5 h-5 text-slate-500" />
            )}
            <span>
              {isExportReady
                ? downloadUrl
                  ? 'Export Again'
                  : 'Start Realtime Video Export'
                : 'Export Disabled (Complete Prerequisites Above)'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
