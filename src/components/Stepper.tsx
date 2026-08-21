import React from 'react';
import { StepNumber, AudioTrackInfo, AudioMetadata, UserTouchedFields, CoverArtSelection } from '../types';
import { StepAudioSelect } from './StepAudioSelect';
import { StepMoodCoverArt } from './StepMoodCoverArt';
import { StepPreview, AspectRatio } from './StepPreview';
import { StepExport } from './StepExport';
import { Check, Lock, Eye } from 'lucide-react';

interface StepperProps {
  currentStep: StepNumber;
  track: AudioTrackInfo | null;
  metadata: AudioMetadata | null;
  userTouched: UserTouchedFields;
  selectedMoodId: string;
  onSelectMood: (moodId: string) => void;
  coverArtSelection: CoverArtSelection;
  onSelectCoverArt: (selection: CoverArtSelection) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  onSelectTrack: (file: File) => void;
  onRemoveTrack: () => void;
  onMetadataFieldChange: (field: keyof AudioMetadata, value: string) => void;
  onError: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void;
}

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  track,
  metadata,
  userTouched,
  selectedMoodId,
  onSelectMood,
  coverArtSelection,
  onSelectCoverArt,
  aspectRatio,
  onAspectRatioChange,
  onSelectTrack,
  onRemoveTrack,
  onMetadataFieldChange,
  onError,
  log,
}) => {
  return (
    <div className="w-full space-y-6 pb-28">
      {/* Step 1: Select Audio Track */}
      <div
        id="step-card-1"
        className={`bg-[#161c2d] border-2 transition-all duration-300 rounded-2xl p-6 ${
          track
            ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            : 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-900 shadow-lg ${
                track ? 'bg-emerald-400 shadow-emerald-500/20' : 'bg-cyan-500 shadow-cyan-500/20'
              }`}
            >
              {track ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Select Audio Track
              </h3>
              <p className="text-xs text-slate-400">
                Upload an MP3, WAV, or M4A track to auto-extract metadata.
              </p>
            </div>
          </div>

          {track && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
              Track Loaded
            </span>
          )}
        </div>

        <StepAudioSelect
          track={track}
          onSelectTrack={onSelectTrack}
          onRemoveTrack={onRemoveTrack}
          onError={onError}
          log={log}
        />
      </div>

      {/* Step 2: Mood & Cover Art */}
      <div
        id="step-card-2"
        className={`bg-[#161c2d] border-2 transition-all duration-300 rounded-2xl p-6 ${
          track
            ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)] opacity-100'
            : 'border-slate-800 opacity-50'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg ${
                track
                  ? 'bg-cyan-500 text-slate-900 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Mood & Cover Art
              </h3>
              <p className="text-xs text-slate-400">
                Select visual mood theme, customize cover art & song brand metadata.
              </p>
            </div>
          </div>

          {!track && (
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Upload track to unlock
            </span>
          )}
        </div>

        <StepMoodCoverArt
          metadata={metadata}
          userTouched={userTouched}
          selectedMoodId={selectedMoodId}
          onSelectMood={onSelectMood}
          coverArtSelection={coverArtSelection}
          onSelectCoverArt={onSelectCoverArt}
          onFieldChange={onMetadataFieldChange}
          onError={onError}
          log={log}
        />
      </div>

      {/* Step 3: Canvas Rendering Engine Live Preview */}
      <div
        id="step-card-3"
        className={`bg-[#161c2d] border-2 transition-all duration-300 rounded-2xl p-6 ${
          track
            ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(34,211,238,0.1)] opacity-100'
            : 'border-slate-800 opacity-50'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg ${
                track
                  ? 'bg-cyan-500 text-slate-900 shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                Canvas Engine Live Preview
              </h3>
              <p className="text-xs text-slate-400">
                100% Client-side Canvas 2D engine rendering static video frame.
              </p>
            </div>
          </div>

          {!track && (
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Upload track to unlock
            </span>
          )}
        </div>

        <StepPreview
          track={track}
          metadata={metadata}
          selectedMoodId={selectedMoodId}
          coverArtSelection={coverArtSelection}
          aspectRatio={aspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          onError={onError}
          log={log}
        />
      </div>

      {/* Step 4: Export & Video Render */}
      <StepExport
        track={track}
        metadata={metadata}
        selectedMoodId={selectedMoodId}
        coverArtSelection={coverArtSelection}
        aspectRatio={aspectRatio}
        onError={onError}
        log={log}
      />
    </div>
  );
};
