export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type?: 'info' | 'success' | 'warn' | 'error';
}

export interface AudioTrackInfo {
  file: File;
  name: string;
  sizeMb: string;
  type: string;
  duration?: number;
  durationFormatted?: string;
  objectUrl?: string;
}

export interface AudioMetadata {
  title: string;
  artist: string;
  album: string;
  channelName: string;
  coverArtUrl?: string | null;
  duration: number;
  durationFormatted: string;
  sources: {
    title: 'id3' | 'filename' | 'fallback';
    artist: 'id3' | 'filename' | 'fallback';
    album: 'id3' | 'filename' | 'fallback';
    channelName: 'derived' | 'fallback';
  };
}

export interface UserTouchedFields {
  title?: boolean;
  artist?: boolean;
  channelName?: boolean;
  album?: boolean;
}

export type StepNumber = 1 | 2 | 3 | 4;

export type CoverArtSource = 'upload' | 'ai' | 'id3' | 'gradient';

export interface CoverArtSelection {
  source: CoverArtSource;
  url: string | null;
}

export interface StepItem {
  id: StepNumber;
  title: string;
  description: string;
  iconName: string;
}
