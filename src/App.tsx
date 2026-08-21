import React, { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import { Header } from './components/Header';
import { ErrorBanner } from './components/ErrorBanner';
import { ConsolePanel } from './components/ConsolePanel';
import { Stepper } from './components/Stepper';
import { AudioTrackInfo, AudioMetadata, UserTouchedFields, LogEntry, StepNumber, CoverArtSelection } from './types';
import { extractAudioMetadata } from './utils/metadata';
import { MOODS, getMoodById, generateGradientDataUrl } from './moods';

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<LogEntry[]>([]);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const pendingFlushRef = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (pendingFlushRef.current !== null) return;
    pendingFlushRef.current = window.setTimeout(() => {
      pendingFlushRef.current = null;
      forceRender();
    }, 250);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingFlushRef.current !== null) {
        clearTimeout(pendingFlushRef.current);
      }
    };
  }, []);

  // STABLE LOGGER - permanently stable identity (Rule 1 & 2)
  const log = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
      });

      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp,
        message,
        type,
      };

      logRef.current.push(newEntry);
      if (logRef.current.length > 200) {
        logRef.current.shift();
      }
      scheduleFlush();
    } catch (e) {
      console.error('Error generating log entry:', e);
    }
  }, [scheduleFlush]);

  const [currentStep] = useState<StepNumber>(1);
  const [audioTrack, setAudioTrack] = useState<AudioTrackInfo | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [userTouched, setUserTouched] = useState<UserTouchedFields>({});

  const audioTrackRef = useRef<AudioTrackInfo | null>(audioTrack);
  audioTrackRef.current = audioTrack;

  const userTouchedRef = useRef<UserTouchedFields>(userTouched);
  userTouchedRef.current = userTouched;

  const [selectedMoodId, setSelectedMoodId] = useState<string>(() => {
    return localStorage.getItem('mv_mood_id') || 'love';
  });

  const selectedMoodIdRef = useRef<string>(selectedMoodId);
  selectedMoodIdRef.current = selectedMoodId;

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(() => {
    const saved = localStorage.getItem('mv_aspect_ratio');
    return saved === '9:16' ? '9:16' : '16:9';
  });

  const [coverArtSelection, setCoverArtSelection] = useState<CoverArtSelection>(() => {
    const initialMood = getMoodById(localStorage.getItem('mv_mood_id') || 'love');
    return {
      source: 'gradient',
      url: generateGradientDataUrl(initialMood),
    };
  });

  // Persist selections to localStorage
  const handleSelectMood = useCallback((moodId: string) => {
    setSelectedMoodId(moodId);
    try {
      localStorage.setItem('mv_mood_id', moodId);
    } catch {}
  }, []);

  const handleAspectRatioChange = useCallback((ratio: '16:9' | '9:16') => {
    setAspectRatio(ratio);
    try {
      localStorage.setItem('mv_aspect_ratio', ratio);
    } catch {}
  }, []);

  // Initialization log
  useEffect(() => {
    log('Client-side video engine initialized successfully. 100% browser rendering ready.', 'success');
    log('WebAudio & WebCodecs MediaRecorder video capture ready.', 'info');
  }, [log]);

  const handleSelectTrack = useCallback(async (file: File) => {
    try {
      setError(null);

      // Clean up previous object URL to avoid memory leaks
      if (audioTrackRef.current?.objectUrl) {
        URL.revokeObjectURL(audioTrackRef.current.objectUrl);
      }

      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const objectUrl = URL.createObjectURL(file);

      log(`Selected file: "${file.name}" (${file.size} bytes)`, 'info');

      // Run automatic metadata extraction
      const extracted = await extractAudioMetadata(file, objectUrl, log);

      // Duration guard check
      if (extracted.duration <= 0) {
        setError('Could not read audio duration - the file may be empty or corrupt');
        log('Could not read audio duration - the file may be empty or corrupt', 'error');
      } else {
        log(`Audio duration read: ${extracted.durationFormatted} (${extracted.duration.toFixed(2)}s)`, 'success');
      }

      const trackInfo: AudioTrackInfo = {
        file,
        name: file.name,
        sizeMb,
        type: file.type || 'audio/mpeg',
        duration: extracted.duration,
        durationFormatted: extracted.durationFormatted,
        objectUrl,
      };

      setAudioTrack(trackInfo);

      // Apply metadata respecting userTouched flags
      const savedChannelName = localStorage.getItem('amvc.channelName') || localStorage.getItem('mv_channel_name') || 'Myanmar Hip Hop Channel Reborn';
      const touched = userTouchedRef.current;
      setMetadata((prev) => {
        const defaultChannel = savedChannelName || extracted.channelName;
        if (!prev) {
          return {
            ...extracted,
            channelName: defaultChannel,
          };
        }
        return {
          ...extracted,
          title: touched.title ? prev.title : extracted.title,
          artist: touched.artist ? prev.artist : extracted.artist,
          channelName: touched.channelName ? prev.channelName : (savedChannelName || extracted.channelName),
          album: touched.album ? prev.album : extracted.album,
        };
      });

      // Update cover art selection
      if (extracted.coverArtUrl) {
        setCoverArtSelection({
          source: 'id3',
          url: extracted.coverArtUrl,
        });
        log('Auto-selected embedded ID3 cover art from MP3', 'info');
      } else {
        const currentMood = getMoodById(selectedMoodIdRef.current);
        setCoverArtSelection({
          source: 'gradient',
          url: generateGradientDataUrl(currentMood),
        });
        log('No ID3 cover art found in MP3 - generated fallback gradient from mood palette', 'info');
      }

    } catch (err: any) {
      const msg = err?.message || 'Error processing audio file metadata';
      setError(msg);
      log(`Metadata extraction error: ${msg}`, 'error');
    }
  }, [log]);

  const handleRemoveTrack = useCallback(() => {
    try {
      if (audioTrackRef.current?.objectUrl) {
        URL.revokeObjectURL(audioTrackRef.current.objectUrl);
      }
      setAudioTrack(null);
      setMetadata(null);
      setError(null);
      const currentMood = getMoodById(selectedMoodIdRef.current);
      setCoverArtSelection({
        source: 'gradient',
        url: generateGradientDataUrl(currentMood),
      });
      log('Audio track and metadata cleared from state', 'info');
    } catch (err: any) {
      log(`Error removing track: ${err?.message}`, 'warn');
    }
  }, [log]);

  const handleMetadataFieldChange = useCallback((field: keyof AudioMetadata, value: string) => {
    setUserTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'channelName') {
      try {
        localStorage.setItem('amvc.channelName', value);
        localStorage.setItem('mv_channel_name', value);
      } catch {}
    }
    setMetadata((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  }, []);

  const handleClearLogs = useCallback(() => {
    logRef.current = [];
    forceRender();
  }, []);

  const handleClearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* App Header */}
      <Header />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Banner */}
        <ErrorBanner error={error} onClear={handleClearError} />

        {/* Stepper with Steps 1, 2, 3, 4 */}
        <Stepper
          currentStep={currentStep}
          track={audioTrack}
          metadata={metadata}
          userTouched={userTouched}
          selectedMoodId={selectedMoodId}
          onSelectMood={handleSelectMood}
          coverArtSelection={coverArtSelection}
          onSelectCoverArt={setCoverArtSelection}
          aspectRatio={aspectRatio}
          onAspectRatioChange={handleAspectRatioChange}
          onSelectTrack={handleSelectTrack}
          onRemoveTrack={handleRemoveTrack}
          onMetadataFieldChange={handleMetadataFieldChange}
          onError={(msg) => setError(msg)}
          log={log}
        />
      </main>

      {/* Collapsible Console Panel */}
      <ConsolePanel logs={logRef.current} onClear={handleClearLogs} />
    </div>
  );
}
