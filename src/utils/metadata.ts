import { AudioMetadata } from '../types';

// Temp name guard regexes
const TEMP_NAME_PATTERNS = [
  /^audio[-_\s]?\d{10,}[-_\s]?\d+$/i,
  /^(file|upload|tmp)[-_\s]?\d{10,}/i,
  /^\d{10,}$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
];

export function isTempName(nameWithoutExt: string): boolean {
  const trimmed = nameWithoutExt.trim();
  return TEMP_NAME_PATTERNS.some((pattern) => pattern.test(trimmed));
}

// Smart Title Case function preserving ALL CAPS acronyms like DJ, MV, EDM
export function smartTitleCase(str: string): string {
  if (!str) return '';

  const ALL_CAPS_PRESERVE = new Set([
    'DJ', 'MV', 'EDM', 'HQ', 'HD', 'VIP', 'ID', 'MC', 'FEAT', 'FT', 'VS', 'UK', 'US', 'FM', 'AM', 'CD', 'EP', 'LP', 'TV', 'AI'
  ]);

  return str
    .split(' ')
    .map((word) => {
      if (!word) return '';
      const upper = word.toUpperCase();
      if (ALL_CAPS_PRESERVE.has(upper)) {
        return upper;
      }
      // If the word was originally uppercase and is 2-4 uppercase characters, preserve it
      if (word === word.toUpperCase() && word.length <= 4 && /^[A-Z]+$/.test(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function cleanFilename(filename: string): {
  artist: string | null;
  title: string | null;
  isRejected: boolean;
} {
  // 1. Strip extension
  let name = filename.replace(/\.[a-zA-Z0-9]+$/i, '').trim();

  // 2. Temp-name guard check
  if (isTempName(name)) {
    return { artist: null, title: null, isRejected: true };
  }

  // 3. Strip leading track number: "04 ", "04. ", "04 - ", "04_", "04-"
  name = name.replace(/^(\d{1,3}[\.\-_]\s*|\d{1,3}\s+)/, '');

  // 4. Remove junk
  const junkPatterns = [
    /\(official\s+music\s+video\)/gi,
    /\(official\s+video\)/gi,
    /\[official\s+music\s+video\]/gi,
    /\[official\s+video\]/gi,
    /\[official\s+audio\]/gi,
    /\(official\s+audio\)/gi,
    /\[lyric\s+video\]/gi,
    /\(lyric\s+video\)/gi,
    /\[lyrics\]/gi,
    /\(lyrics\)/gi,
    /\[hq\]/gi,
    /\(hq\)/gi,
    /\[hd\]/gi,
    /\(hd\)/gi,
    /320kbps/gi,
    /128kbps/gi,
    /www\.[a-z0-9\-]+\.[a-z]{2,}/gi,
    /[a-z0-9\-]+\.(com|cc|net|org|io|mp3)/gi,
  ];

  junkPatterns.forEach((pattern) => {
    name = name.replace(pattern, '');
  });

  // 5. Replace underscores with spaces
  name = name.replace(/_/g, ' ');

  // 6. Collapse repeated spaces
  name = name.replace(/\s+/g, ' ').trim();

  if (!name) {
    return { artist: null, title: null, isRejected: true };
  }

  // 7. Check if it matches "Artist - Title" or "Artist – Title" or "Artist — Title"
  const dashMatch = name.split(/\s*[\-\–\—]\s*/);
  if (dashMatch.length >= 2) {
    const rawArtist = dashMatch[0].trim();
    const rawTitle = dashMatch.slice(1).join(' - ').trim();
    return {
      artist: rawArtist ? smartTitleCase(rawArtist) : null,
      title: rawTitle ? smartTitleCase(rawTitle) : null,
      isRejected: false,
    };
  }

  return {
    artist: null,
    title: smartTitleCase(name),
    isRejected: false,
  };
}

export interface Id3Data {
  title?: string;
  artist?: string;
  album?: string;
  coverArtUrl?: string;
}

// Safely load jsmediatags in browser environment
async function getJsMediaTags(): Promise<any> {
  if ((window as any).jsmediatags) {
    return (window as any).jsmediatags;
  }

  // Try dynamic script tag loading
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js';
    script.onload = () => {
      resolve((window as any).jsmediatags || null);
    };
    script.onerror = () => {
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

export async function readId3Tags(file: File): Promise<Id3Data> {
  return new Promise(async (resolve) => {
    let completed = false;

    // 5 second timeout safety rule
    const timer = setTimeout(() => {
      if (!completed) {
        completed = true;
        resolve({});
      }
    }, 5000);

    try {
      const jsmediatags = await getJsMediaTags();
      if (!jsmediatags) {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve({});
        }
        return;
      }

      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          if (completed) return;
          completed = true;
          clearTimeout(timer);

          const tags = tag.tags || {};
          let coverArtUrl: string | undefined = undefined;

          if (tags.picture) {
            try {
              const { data, format } = tags.picture;
              const byteArray = new Uint8Array(data);
              const blob = new Blob([byteArray], { type: format || 'image/jpeg' });
              coverArtUrl = URL.createObjectURL(blob);
            } catch (e) {
              console.warn('Failed to parse APIC cover art image', e);
            }
          }

          resolve({
            title: tags.title ? tags.title.trim() : undefined,
            artist: tags.artist ? tags.artist.trim() : undefined,
            album: tags.album ? tags.album.trim() : undefined,
            coverArtUrl,
          });
        },
        onError: (_error: any) => {
          if (completed) return;
          completed = true;
          clearTimeout(timer);
          resolve({});
        },
      });
    } catch (e) {
      if (!completed) {
        completed = true;
        clearTimeout(timer);
        resolve({});
      }
    }
  });
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export async function getAudioDuration(file: File, objectUrl: string): Promise<number> {
  // Method 1: HTML Audio Element
  const durationFromAudio = await new Promise<number>((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = objectUrl;

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('error', onError);
    };

    const onLoaded = () => {
      cleanup();
      resolve(audio.duration);
    };

    const onError = () => {
      cleanup();
      resolve(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('error', onError);

    setTimeout(() => {
      cleanup();
      if (isNaN(audio.duration) || !isFinite(audio.duration) || audio.duration <= 0) {
        resolve(0);
      } else {
        resolve(audio.duration);
      }
    }, 3000);
  });

  if (durationFromAudio && isFinite(durationFromAudio) && durationFromAudio > 0) {
    return durationFromAudio;
  }

  // Method 2: Fallback to AudioContext.decodeAudioData
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioContext = new AudioContextClass();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;
      await audioContext.close();
      if (duration && isFinite(duration) && duration > 0) {
        return duration;
      }
    }
  } catch (e) {
    console.warn('AudioContext decodeAudioData failed:', e);
  }

  return 0;
}

export async function extractAudioMetadata(
  file: File,
  objectUrl: string,
  log: (msg: string, type?: 'info' | 'success' | 'warn' | 'error') => void
): Promise<AudioMetadata> {
  log(`Extracting metadata for "${file.name}"...`, 'info');

  // 1. ID3 Tags
  const id3 = await readId3Tags(file);

  // 2. Cleaned Filename
  const cleaned = cleanFilename(file.name);

  // 3. Duration
  const duration = await getAudioDuration(file, objectUrl);
  const durationFormatted = formatDuration(duration);

  // Determine Title & Source
  let title = 'Untitled Track';
  let titleSource: 'id3' | 'filename' | 'fallback' = 'fallback';

  if (id3.title && id3.title.trim().length > 0) {
    title = id3.title.trim();
    titleSource = 'id3';
  } else if (!cleaned.isRejected && cleaned.title) {
    title = cleaned.title;
    titleSource = 'filename';
  }

  // Determine Artist & Source
  let artist = 'Unknown Artist';
  let artistSource: 'id3' | 'filename' | 'fallback' = 'fallback';

  if (id3.artist && id3.artist.trim().length > 0) {
    artist = id3.artist.trim();
    artistSource = 'id3';
  } else if (!cleaned.isRejected && cleaned.artist) {
    artist = cleaned.artist;
    artistSource = 'filename';
  }

  // Determine Album & Source
  let album = 'Single';
  let albumSource: 'id3' | 'filename' | 'fallback' = 'fallback';

  if (id3.album && id3.album.trim().length > 0) {
    album = id3.album.trim();
    albumSource = 'id3';
  }

  // Determine Channel / Brand Name
  const savedChannel = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('amvc.channelName') || localStorage.getItem('mv_channel_name'))
    : null;
  let channelName = savedChannel || (artist !== 'Unknown Artist' ? `${artist} Official` : 'Myanmar Hip Hop Channel Reborn');
  let channelSource: 'derived' | 'fallback' = savedChannel
    ? 'fallback'
    : (artist !== 'Unknown Artist' ? 'derived' : 'fallback');

  log(`title <- ${titleSource} ("${title}")`, 'info');
  log(`artist <- ${artistSource} ("${artist}")`, 'info');
  log(`album <- ${albumSource} ("${album}")`, 'info');
  log(`channelName <- ${channelSource} ("${channelName}")`, 'info');

  if (id3.coverArtUrl) {
    log(`coverArt <- id3 (embedded APIC image extracted)`, 'success');
  }

  if (cleaned.isRejected) {
    log(`Filename "${file.name}" matched temp-name guard. Ignored filename parsing.`, 'warn');
  }

  return {
    title,
    artist,
    album,
    channelName,
    coverArtUrl: id3.coverArtUrl || null,
    duration,
    durationFormatted,
    sources: {
      title: titleSource,
      artist: artistSource,
      album: albumSource,
      channelName: channelSource,
    },
  };
}
