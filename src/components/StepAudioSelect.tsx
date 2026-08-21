import React, { useRef, useState } from 'react';
import { Upload, FileAudio, RefreshCw, Play, Pause, Volume2, Clock, HardDrive, Trash2 } from 'lucide-react';
import { AudioTrackInfo } from '../types';

interface StepAudioSelectProps {
  track: AudioTrackInfo | null;
  onSelectTrack: (file: File) => void;
  onRemoveTrack: () => void;
  onError: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

const ACCEPTED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg'
];

export const StepAudioSelect: React.FC<StepAudioSelectProps> = ({
  track,
  onSelectTrack,
  onRemoveTrack,
  onError,
  log,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const validateAndProcessFile = (file: File) => {
    log(`Selected file: "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB)`, 'info');

    try {
      if (!file) {
        throw new Error('No file provided.');
      }

      // Validate audio file format
      const isAudioType = file.type.startsWith('audio/') || ACCEPTED_MIME_TYPES.some(t => file.type.includes(t)) || file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i);
      
      if (!isAudioType) {
        throw new Error(`Unsupported file type: "${file.type || file.name}". Please upload an MP3, WAV, or M4A audio file.`);
      }

      // Check max size safeguard
      if (file.size > 100 * 1024 * 1024) {
        throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an audio file under 100MB.`);
      }

      onSelectTrack(file);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to process audio file.';
      log(`Audio file selection error: ${errorMsg}`, 'error');
      onError(errorMsg);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    try {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        validateAndProcessFile(file);
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to read dropped file.');
      log(`Drop handler exception: ${err?.message}`, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        validateAndProcessFile(file);
        e.target.value = '';
      }
    } catch (err: any) {
      onError(err?.message || 'Error choosing file.');
      log(`File input change exception: ${err?.message}`, 'error');
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          log(`Audio preview error: ${err.message}`, 'error');
          onError('Playback blocked. Click play to start listening.');
        });
      }
    } catch (err: any) {
      onError('Audio playback error');
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/m4a,audio/aac"
        onChange={handleFileChange}
        className="hidden"
        id="audio-file-input"
      />

      {!track ? (
        <div
          id="audio-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-colors cursor-pointer group ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-slate-700 hover:border-cyan-400 bg-[#0f172a]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-100 group-hover:text-cyan-300 transition-colors">
              Drag and drop audio file
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports MP3, WAV, M4A up to 100MB
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-1">
                    Current Selection
                  </p>
                  <h4 className="text-md font-semibold text-white truncate max-w-md" title={track.name}>
                    {track.name}
                  </h4>
                </div>
                <span className="text-[10px] bg-slate-700 text-slate-300 px-2.5 py-1 rounded font-mono font-semibold shrink-0 ml-2">
                  {track.sizeMb} MB
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                id="replace-audio-btn"
                className="text-xs font-semibold text-slate-300 hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Click to replace file
              </button>

              <button
                onClick={() => {
                  onRemoveTrack();
                }}
                id="remove-audio-btn"
                title="Remove audio track"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Audio Preview */}
          {track.objectUrl && (
            <div className="bg-[#0f172a] p-3 rounded-lg border border-slate-800 flex items-center gap-3">
              <audio
                ref={audioRef}
                src={track.objectUrl}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <button
                onClick={togglePlay}
                id="audio-preview-play-btn"
                className="p-2 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-semibold shadow transition-all cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Playback Preview</span>
                  {track.durationFormatted && <span>{track.durationFormatted}</span>}
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-400 h-full transition-all duration-100"
                    style={{
                      width: `${
                        track.duration && track.duration > 0
                          ? (currentTime / track.duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <Volume2 className="w-4 h-4 text-slate-500 shrink-0 hidden sm:block" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
