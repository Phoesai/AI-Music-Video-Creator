export type MoodCategoryId = 'heartbreak' | 'love' | 'street' | 'vibe' | 'uplift';

export interface MoodCategory {
  id: MoodCategoryId;
  labelEn: string;
  labelMy: string;
}

export const MOOD_CATEGORIES: MoodCategory[] = [
  { id: 'heartbreak', labelEn: 'HEARTBREAK & PAIN', labelMy: 'အသဲကွဲ' },
  { id: 'love', labelEn: 'LOVE & R&B', labelMy: 'အချစ်' },
  { id: 'street', labelEn: 'STREET & POWER', labelMy: 'လမ်းသွယ်' },
  { id: 'vibe', labelEn: 'VIBE & CHILL', labelMy: 'အေးဆေး' },
  { id: 'uplift', labelEn: 'UPLIFT', labelMy: 'အားတင်း' },
];

export interface MoodGrade {
  saturation: number;
  contrast: number;
  brightness: number;
  warmth: number;
  vignette: number;
  grain: number;
}

export interface MoodMotion {
  type: 'zoomIn' | 'zoomOut' | 'panLR' | 'panRL' | 'drift' | 'pulse' | 'shake';
  intensity: number;
}

export interface MoodTypeConfig {
  titleFont: string;
  weight: string;
  titleColor: string;
  subColor: string;
}

export interface Mood {
  id: string;
  category: MoodCategoryId;
  labelEn: string;
  labelMy: string;
  emoji: string;
  promptCore: string;
  palette: [string, string, string];
  grade: MoodGrade;
  motion: MoodMotion;
  type: MoodTypeConfig;
}

export const QUALITY_SUFFIX =
  'original album cover artwork, cinematic lighting, volumetric atmosphere, shallow depth of field, 35mm film texture, highly detailed, professional music artwork, square 1:1 composition, subject centered with clean negative space at the bottom third for text overlay';

export const NEGATIVE_PROMPT =
  'no text, no letters, no words, no typography, no captions, no watermark, no signature, no logo, no brand name, no trademark, no readable signage, no QR code, no real people, no celebrity, no recognizable face, no portrait likeness, no cartoon character, no anime character, no mascot, no sports jersey, no team logo, no product packaging, no album cover reproduction, no movie poster, no book cover, no nudity, no gore, no weapons pointed at viewer, no drug paraphernalia';

export const MOODS: Mood[] = [
  // 1. HEARTBREAK & PAIN (အသဲကွဲ)
  {
    id: 'heartbreak',
    category: 'heartbreak',
    labelEn: 'Heartbreak',
    labelMy: 'အသဲကွဲ',
    emoji: '💔',
    promptCore:
      'shattered mirror shards on wet concrete, a single wilting red rose in the debris, cold blue key light with faint red rim, abandoned apartment at 3am, drifting dust and haze, deep shadows',
    palette: ['#0B1220', '#E23A5E', '#9FB6D9'],
    grade: {
      saturation: 0.82,
      contrast: 1.18,
      brightness: 1.0,
      warmth: 0.65, // warm -.35 -> 1.0 - 0.35
      vignette: 0.55,
      grain: 0.22,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.45,
    },
    type: {
      titleFont: "'Playfair Display', serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#9fb6d9',
    },
  },
  {
    id: 'longing',
    category: 'heartbreak',
    labelEn: 'Longing',
    labelMy: 'လွမ်း',
    emoji: '🌧️',
    promptCore:
      'lone silhouette from behind through a rain-streaked bus window at night, city bokeh melting into streaks, warm amber interior lamp against cold blue rain, condensation on glass, distance and separation',
    palette: ['#0E1826', '#5FA8D3', '#F0C27B'],
    grade: {
      saturation: 0.88,
      contrast: 1.08,
      brightness: 1.0,
      warmth: 0.8, // warm -.2 -> 1.0 - 0.2
      vignette: 0.48,
      grain: 0.2,
    },
    motion: {
      type: 'drift',
      intensity: 0.35,
    },
    type: {
      titleFont: "'Lora', serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#f0c27b',
    },
  },
  {
    id: 'hate',
    category: 'heartbreak',
    labelEn: 'Hate',
    labelMy: 'အမုန်း',
    emoji: '🔥',
    promptCore:
      'cracked concrete wall washed in harsh crimson strobe light, thick low smoke, the hard shadow of a hooded figure cast from behind, sparks in the air, brutal industrial atmosphere, extreme contrast',
    palette: ['#0A0A0A', '#FF2D2D', '#FF8A5C'],
    grade: {
      saturation: 1.15,
      contrast: 1.35,
      brightness: 1.0,
      warmth: 1.25, // warm .25
      vignette: 0.62,
      grain: 0.3,
    },
    motion: {
      type: 'pulse',
      intensity: 0.75,
    },
    type: {
      titleFont: "'Impact', sans-serif",
      weight: '900',
      titleColor: '#ffffff',
      subColor: '#ff8a5c',
    },
  },
  {
    id: 'betrayal',
    category: 'heartbreak',
    labelEn: 'Betrayal',
    labelMy: 'သစ္စာဖောက်',
    emoji: '🗡️',
    promptCore:
      'a torn photograph on a dark wooden table, one half fallen into shadow, dim tungsten desk lamp, cigarette smoke curling through the beam, spilled glass, film-noir mood, crushed blacks',
    palette: ['#100C08', '#C9A227', '#6E6259'],
    grade: {
      saturation: 0.75,
      contrast: 1.28,
      brightness: 1.0,
      warmth: 1.18, // warm .18
      vignette: 0.68,
      grain: 0.28,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.3,
    },
    type: {
      titleFont: "'Playfair Display', serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#c9a227',
    },
  },
  {
    id: 'regret',
    category: 'heartbreak',
    labelEn: 'Regret',
    labelMy: 'နောင်တ',
    emoji: '🕯️',
    promptCore:
      'an empty wooden chair beside a tall window at dawn, one shaft of pale light full of floating dust, faded curtains moving slightly, bare room, muted sepia and grey, quiet stillness',
    palette: ['#1A1712', '#C8B49A', '#7E7566'],
    grade: {
      saturation: 0.7,
      contrast: 1.05,
      brightness: 1.0,
      warmth: 1.15, // warm .15
      vignette: 0.45,
      grain: 0.26,
    },
    motion: {
      type: 'zoomOut',
      intensity: 0.28,
    },
    type: {
      titleFont: "'Lora', serif",
      weight: '400',
      titleColor: '#ffffff',
      subColor: '#c8b49a',
    },
  },
  {
    id: 'lonely',
    category: 'heartbreak',
    labelEn: 'Lonely',
    labelMy: 'အထီးကျန်',
    emoji: '🌑',
    promptCore:
      'a single streetlamp on an empty road at night, long stretched shadow, thick low fog, distant city glow on the horizon, vast empty negative space, cold desaturated palette',
    palette: ['#080D14', '#4A6A8A', '#D8E3ED'],
    grade: {
      saturation: 0.62,
      contrast: 1.12,
      brightness: 1.0,
      warmth: 0.6, // warm -.4
      vignette: 0.58,
      grain: 0.24,
    },
    motion: {
      type: 'zoomOut',
      intensity: 0.32,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '400',
      titleColor: '#ffffff',
      subColor: '#d8e3ed',
    },
  },

  // 2. LOVE & R&B (အချစ်)
  {
    id: 'love',
    category: 'love',
    labelEn: 'Love',
    labelMy: 'အချစ်',
    emoji: '💗',
    promptCore:
      'golden hour rooftop, two distant silhouettes standing apart against a warm hazy sky, huge soft bokeh orbs, dust in the light, dreamy 35mm film',
    palette: ['#2A1420', '#FF8FA3', '#FFD9A0'],
    grade: {
      saturation: 1.08,
      contrast: 1.02,
      brightness: 1.0,
      warmth: 1.55, // warm .55
      vignette: 0.35,
      grain: 0.18,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.4,
    },
    type: {
      titleFont: "'Playfair Display', serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#ffd9a0',
    },
  },
  {
    id: 'slowjam',
    category: 'love',
    labelEn: 'Slow Jam',
    labelMy: 'ချိုမြိန်',
    emoji: '🥂',
    promptCore:
      'candlelit room with heavy silk curtains, warm amber and deep burgundy, velvet texture, soft shadows across fabric folds, two wine glasses catching the light, intimate elegant low-key lighting',
    palette: ['#1C0B12', '#B5305A', '#E8B98A'],
    grade: {
      saturation: 1.05,
      contrast: 1.12,
      brightness: 1.0,
      warmth: 1.45, // warm .45
      vignette: 0.52,
      grain: 0.2,
    },
    motion: {
      type: 'drift',
      intensity: 0.3,
    },
    type: {
      titleFont: "'Lora', serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#e8b98a',
    },
  },
  {
    id: 'latenight',
    category: 'love',
    labelEn: 'Late Night',
    labelMy: 'ညသန်းခေါင်',
    emoji: '🌙',
    promptCore:
      'neon-lit balcony overlooking a sleeping city at 3am, purple and teal glow bleeding into the dark, a curl of smoke, condensation on a glass railing, distant traffic light trails, moody R&B atmosphere',
    palette: ['#0D0A1F', '#8B5CF6', '#22D3EE'],
    grade: {
      saturation: 1.12,
      contrast: 1.15,
      brightness: 1.0,
      warmth: 0.85, // warm -.15
      vignette: 0.55,
      grain: 0.22,
    },
    motion: {
      type: 'panLR',
      intensity: 0.38,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#22d3ee',
    },
  },
  {
    id: 'toxic',
    category: 'love',
    labelEn: 'Toxic Love',
    labelMy: 'မကွဲနိုင်',
    emoji: '🥀',
    promptCore:
      'a single red rose wrapped tightly in barbed wire, dripping black wax, deep magenta and charcoal background, one dramatic hard light source, beautiful but dangerous, glossy dark surface reflection',
    palette: ['#14060F', '#E11D74', '#2E1A2E'],
    grade: {
      saturation: 1.1,
      contrast: 1.3,
      brightness: 1.0,
      warmth: 1.1, // warm .10
      vignette: 0.65,
      grain: 0.26,
    },
    motion: {
      type: 'pulse',
      intensity: 0.45,
    },
    type: {
      titleFont: "'Space Grotesk', sans-serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#e11d74',
    },
  },

  // 3. STREET & POWER (လမ်းသွယ်)
  {
    id: 'street',
    category: 'street',
    labelEn: 'Street',
    labelMy: 'လမ်းသွယ်',
    emoji: '🌃',
    promptCore:
      'narrow Southeast Asian city street at night after heavy rain, unreadable neon glow reflecting on wet asphalt, tangled overhead power lines, steam rising from a food cart, cinematic teal and orange, deep perspective',
    palette: ['#07131A', '#F97316', '#2DD4BF'],
    grade: {
      saturation: 1.18,
      contrast: 1.22,
      brightness: 1.0,
      warmth: 1.05, // warm .05
      vignette: 0.5,
      grain: 0.28,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.42,
    },
    type: {
      titleFont: "'Space Grotesk', sans-serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#2dd4bf',
    },
  },
  {
    id: 'trap',
    category: 'street',
    labelEn: 'Trap',
    labelMy: 'Trap',
    emoji: '🖤',
    promptCore:
      'empty underground parking garage lit by cold blue fluorescent tubes, low camera angle, heavy black shadows between concrete pillars, chrome reflections, hanging haze, gritty industrial texture',
    palette: ['#05070A', '#3B82F6', '#94A3B8'],
    grade: {
      saturation: 0.85,
      contrast: 1.32,
      brightness: 1.0,
      warmth: 0.55, // warm -.45
      vignette: 0.66,
      grain: 0.32,
    },
    motion: {
      type: 'pulse',
      intensity: 0.6,
    },
    type: {
      titleFont: "'Impact', sans-serif",
      weight: '900',
      titleColor: '#ffffff',
      subColor: '#93c5fd',
    },
  },
  {
    id: 'drill',
    category: 'street',
    labelEn: 'Drill',
    labelMy: 'Drill',
    emoji: '❄️',
    promptCore:
      'foggy concrete housing estate at night under harsh sodium lights, hooded silhouettes seen from behind at a distance, icy blue and grey palette, chain-link fence, cold breath in the air, harsh contrast, heavy grain',
    palette: ['#0A0F14', '#7DD3FC', '#475569'],
    grade: {
      saturation: 0.7,
      contrast: 1.38,
      brightness: 1.0,
      warmth: 0.45, // warm -.55
      vignette: 0.7,
      grain: 0.36,
    },
    motion: {
      type: 'shake',
      intensity: 0.55,
    },
    type: {
      titleFont: "'Space Grotesk', sans-serif",
      weight: '900',
      titleColor: '#ffffff',
      subColor: '#7dd3fc',
    },
  },
  {
    id: 'battle',
    category: 'street',
    labelEn: 'Battle',
    labelMy: 'Battle',
    emoji: '⚔️',
    promptCore:
      'underground boxing ring under one swinging hanging bulb, chalk dust suspended in the air, raw concrete walls, aggressive red rim light against deep black, ropes and shadows, high tension',
    palette: ['#0A0505', '#EF4444', '#FDE68A'],
    grade: {
      saturation: 1.1,
      contrast: 1.42,
      brightness: 1.0,
      warmth: 1.2, // warm .20
      vignette: 0.72,
      grain: 0.34,
    },
    motion: {
      type: 'pulse',
      intensity: 0.85,
    },
    type: {
      titleFont: "'Impact', sans-serif",
      weight: '900',
      titleColor: '#ffffff',
      subColor: '#fde68a',
    },
  },
  {
    id: 'flex',
    category: 'street',
    labelEn: 'Flex',
    labelMy: 'ချမ်းသာ',
    emoji: '👑',
    promptCore:
      'polished black marble surface with liquid gold pouring across it, chandelier bokeh overhead, champagne mist, deep blacks with sharp gold rim lighting, opulent luxury textures, no brand names anywhere',
    palette: ['#0B0B0B', '#D4AF37', '#F5E6B8'],
    grade: {
      saturation: 1.12,
      contrast: 1.25,
      brightness: 1.0,
      warmth: 1.4, // warm .40
      vignette: 0.58,
      grain: 0.18,
    },
    motion: {
      type: 'panRL',
      intensity: 0.35,
    },
    type: {
      titleFont: "'Cinzel', serif",
      weight: '900',
      titleColor: '#f5e6b8',
      subColor: '#d4af37',
    },
  },
  {
    id: 'hustle',
    category: 'street',
    labelEn: 'Hustle',
    labelMy: 'ကြိုးစား',
    emoji: '🌆',
    promptCore:
      'city skyline at 5am from an unfinished construction rooftop, first light on the horizon, a lone silhouette from behind facing the sun, cold blue night turning to warm gold, scaffolding, ambition and grit',
    palette: ['#0D1526', '#F59E0B', '#60A5FA'],
    grade: {
      saturation: 1.05,
      contrast: 1.18,
      brightness: 1.0,
      warmth: 1.25, // warm .25
      vignette: 0.44,
      grain: 0.24,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.5,
    },
    type: {
      titleFont: "'Space Grotesk', sans-serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#f59e0b',
    },
  },

  // 4. VIBE & CHILL (အေးဆေး / Vibe)
  {
    id: 'nostalgia',
    category: 'vibe',
    labelEn: 'Nostalgia',
    labelMy: 'အမှတ်တရ',
    emoji: '📼',
    promptCore:
      'scattered stack of blank faded instant photos on a wooden floor, warm afternoon light through venetian blinds, floating dust, subtle VHS scanline texture, 1990s memory tone, soft focus edges',
    palette: ['#1F1A14', '#E8A87C', '#C38D9E'],
    grade: {
      saturation: 0.9,
      contrast: 1.0,
      brightness: 1.0,
      warmth: 1.5, // warm .50
      vignette: 0.42,
      grain: 0.38,
    },
    motion: {
      type: 'drift',
      intensity: 0.3,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#e8a87c',
    },
  },
  {
    id: 'friends',
    category: 'vibe',
    labelEn: 'Friends',
    labelMy: 'သူငယ်ချင်း',
    emoji: '🤝',
    promptCore:
      'rooftop gathering at sunset, a row of group silhouettes seen from behind against warm dusk haze, string lights overhead, city rooftops below',
    palette: ['#251A2E', '#FBBF24', '#F472B6'],
    grade: {
      saturation: 1.08,
      contrast: 1.05,
      brightness: 1.0,
      warmth: 1.48, // warm .48
      vignette: 0.38,
      grain: 0.24,
    },
    motion: {
      type: 'panLR',
      intensity: 0.36,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '700',
      titleColor: '#ffffff',
      subColor: '#fbbf24',
    },
  },
  {
    id: 'nature',
    category: 'vibe',
    labelEn: 'Nature',
    labelMy: 'သဘာဝ',
    emoji: '🏔️',
    promptCore:
      'layered misty mountain ridgelines at dawn, thick fog filling the valley, soft god rays through the haze, wide cinematic vista, cool green and pale gold, immense scale and stillness',
    palette: ['#0F1A18', '#5EEAD4', '#FDE68A'],
    grade: {
      saturation: 1.02,
      contrast: 1.08,
      brightness: 1.0,
      warmth: 1.1, // warm .10
      vignette: 0.34,
      grain: 0.18,
    },
    motion: {
      type: 'drift',
      intensity: 0.34,
    },
    type: {
      titleFont: "'Cinzel', serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#5eead4',
    },
  },
  {
    id: 'chill',
    category: 'vibe',
    labelEn: 'Chill',
    labelMy: 'အေးဆေး',
    emoji: '🎧',
    promptCore:
      'cozy bedroom studio at night, warm desk lamp glow, hanging plants, rain running down the window, soft purple and amber ambient light, headphones on the desk, lo-fi calm',
    palette: ['#141222', '#A78BFA', '#FCD34D'],
    grade: {
      saturation: 1.0,
      contrast: 1.04,
      brightness: 1.0,
      warmth: 1.22, // warm .22
      vignette: 0.46,
      grain: 0.26,
    },
    motion: {
      type: 'drift',
      intensity: 0.26,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#a78bfa',
    },
  },

  // 5. UPLIFT (အားတင်း)
  {
    id: 'hope',
    category: 'uplift',
    labelEn: 'Hope',
    labelMy: 'မျှော်လင့်ချက်',
    emoji: '🌅',
    promptCore:
      'sunrise over calm open water, golden light breaking through layered clouds, one distant silhouette from behind on a pier, mirror-still reflections, expansive and hopeful, soft lens flare',
    palette: ['#12203A', '#FBBF24', '#93C5FD'],
    grade: {
      saturation: 1.06,
      contrast: 1.06,
      brightness: 1.0,
      warmth: 1.42, // warm .42
      vignette: 0.32,
      grain: 0.16,
    },
    motion: {
      type: 'zoomOut',
      intensity: 0.34,
    },
    type: {
      titleFont: "'Plus Jakarta Sans', sans-serif",
      weight: '600',
      titleColor: '#ffffff',
      subColor: '#93c5fd',
    },
  },
  {
    id: 'rise',
    category: 'uplift',
    labelEn: 'Rise',
    labelMy: 'အားတင်း',
    emoji: '🚀',
    promptCore:
      'long empty stadium stairway at dawn from a dramatic low upward angle, sun flare cresting the top step, dust and mist in the air, cold shadow rising into warm gold, triumphant momentum',
    palette: ['#0E1220', '#F97316', '#38BDF8'],
    grade: {
      saturation: 1.1,
      contrast: 1.2,
      brightness: 1.0,
      warmth: 1.3, // warm .30
      vignette: 0.48,
      grain: 0.22,
    },
    motion: {
      type: 'zoomIn',
      intensity: 0.62,
    },
    type: {
      titleFont: "'Space Grotesk', sans-serif",
      weight: '900',
      titleColor: '#ffffff',
      subColor: '#f97316',
    },
  },
];

export function getMoodById(id: string): Mood {
  return MOODS.find((m) => m.id === id) || MOODS[0];
}

export function generateGradientDataUrl(mood: Mood): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
  gradient.addColorStop(0, mood.palette[0]);
  gradient.addColorStop(0.5, mood.palette[1]);
  gradient.addColorStop(1, mood.palette[2]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle overlay pattern
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, 512, 512);

  return canvas.toDataURL('image/png');
}

export interface SanitizeResult {
  sanitizedText: string;
  warnings: string[];
}

export function sanitizeCustomPrompt(rawText: string): SanitizeResult {
  if (!rawText) return { sanitizedText: '', warnings: [] };

  const warnings: string[] = [];
  let cleaned = rawText;

  // 1. Style-of patterns
  const stylePattern = /\b(in the style of|style of|inspired by|like)\s+[A-Za-z0-9_'-]+/gi;
  if (stylePattern.test(cleaned)) {
    cleaned = cleaned.replace(stylePattern, '');
    warnings.push('style or reference phrasing');
  }

  // 2. Album cover / poster / logo patterns
  const coverPattern = /\b(album cover of|cover art of|poster of|logo of)\b/gi;
  if (coverPattern.test(cleaned)) {
    cleaned = cleaned.replace(coverPattern, '');
    warnings.push('reproduction or logo phrasing');
  }

  // 3. Real artist names
  const ARTISTS = [
    'drake',
    'kendrick',
    'travis scott',
    'kanye',
    'ye',
    'the weeknd',
    'sza',
    'beyonce',
    'rihanna',
    'eminem',
    'tupac',
    'biggie',
    'nipsey',
    'juice wrld',
    'xxxtentacion',
  ];
  for (const artist of ARTISTS) {
    const re = new RegExp(`\\b${artist.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    if (re.test(cleaned)) {
      cleaned = cleaned.replace(re, '');
      warnings.push(`artist reference ('${artist}')`);
    }
  }

  // 4. Trademarked brands
  const BRANDS = [
    'nike',
    'adidas',
    'gucci',
    'supreme',
    'louis vuitton',
    'balenciaga',
    'off-white',
    'jordan',
    'yeezy',
    'rolex',
    'bmw',
    'mercedes',
    'lamborghini',
    'ferrari',
    'apple',
    'disney',
    'marvel',
    'pokemon',
  ];
  for (const brand of BRANDS) {
    const re = new RegExp(`\\b${brand.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    if (re.test(cleaned)) {
      cleaned = cleaned.replace(re, '');
      warnings.push(`trademarked brand ('${brand}')`);
    }
  }

  // Clean up punctuation artifacts
  cleaned = cleaned.replace(/\s+,/g, ',').replace(/,+/g, ',').replace(/\s+/g, ' ').trim();

  return {
    sanitizedText: cleaned,
    warnings,
  };
}

export function buildImagePrompt(mood: Mood, userExtra?: string): string {
  const parts = [mood.promptCore];

  if (userExtra && userExtra.trim().length > 0) {
    const { sanitizedText } = sanitizeCustomPrompt(userExtra);
    if (sanitizedText) {
      parts.push(sanitizedText);
    }
  }

  parts.push(QUALITY_SUFFIX);
  parts.push(NEGATIVE_PROMPT);

  return parts.join(', ');
}
