import { Mood } from '../moods';
import { FrameEnergy } from '../utils/audioAnalyzer';

export type VisualizerStyle = 'Bars' | 'Waveline' | 'None';

export interface RenderState {
  cover: HTMLImageElement | HTMLCanvasElement | null;
  mood: Mood;
  title: string;
  artist: string;
  channel: string;
  duration: number;
  energy?: FrameEnergy | null;
  getEnergy?: (t: number) => FrameEnergy;
  motionIntensity?: number; // 0 to 100, default 60
  visualizerStyle?: VisualizerStyle; // 'Bars' | 'Waveline' | 'None'
}

let cachedNoisePattern: CanvasPattern | null = null;

function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (cachedNoisePattern) return cachedNoisePattern;
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const gCtx = canvas.getContext('2d');
  if (!gCtx) return null;

  const imgData = gCtx.createImageData(256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 45; // Subtle grain noise
  }
  gCtx.putImageData(imgData, 0, 0);

  cachedNoisePattern = ctx.createPattern(canvas, 'repeat');
  return cachedNoisePattern;
}

function easeInOutSine(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return 0.5 * (1 - Math.cos(Math.PI * clamped));
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  t: number = 0
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  if (width === 0 || height === 0) return;

  const isPortrait = height > width;
  const mood = state.mood;
  const grade = mood.grade;
  const duration = state.duration && state.duration > 0 ? state.duration : 180;

  // Motion intensity multiplier (0 - 100, default 60)
  const motionIntensityVal = state.motionIntensity ?? 60;
  const intensityFactor = (motionIntensityVal / 60) * (mood.motion?.intensity ?? 1.0);

  // Clear canvas
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // -------------------------------------------------------------
  // a) BACKGROUND: Ken Burns motion on cover image, blurred & darkened
  // -------------------------------------------------------------
  const rawProgress = Math.max(0, Math.min(1, t / duration));
  const bgProgress = easeInOutSine(rawProgress);

  let bgScale = 1.0;
  let bgOffsetX = 0;
  let bgOffsetY = 0;

  switch (mood.motion?.type) {
    case 'zoomIn':
      bgScale = 1.0 + 0.14 * bgProgress * intensityFactor;
      break;
    case 'zoomOut':
      bgScale = 1.14 - 0.14 * bgProgress * intensityFactor;
      break;
    case 'panLR':
      bgScale = 1.0 + 0.12 * intensityFactor;
      bgOffsetX = (-0.03 + 0.06 * bgProgress) * width * intensityFactor;
      break;
    case 'panRL':
      bgScale = 1.0 + 0.12 * intensityFactor;
      bgOffsetX = (0.03 - 0.06 * bgProgress) * width * intensityFactor;
      break;
    case 'shake':
      bgScale = 1.08 + 0.04 * bgProgress * intensityFactor;
      {
        // Tiny 2-3px random offset per frame (30fps seed) scaled by intensity
        const frameSeed = Math.floor(t * 30);
        const randX = (((frameSeed * 9301 + 49297) % 233280) / 233280) - 0.5;
        const randY = (((frameSeed * 49297 + 9301) % 233280) / 233280) - 0.5;
        bgOffsetX = randX * 6 * (width / 1920) * intensityFactor;
        bgOffsetY = randY * 6 * (height / 1080) * intensityFactor;
      }
      break;
    case 'drift':
      bgScale = 1.08 + 0.04 * Math.sin((2 * Math.PI * t) / 20.0) * intensityFactor;
      bgOffsetX = ((bgProgress * 0.04 - 0.02) + 0.015 * Math.sin((2 * Math.PI * t) / 12.0)) * width * intensityFactor;
      bgOffsetY = ((bgProgress * 0.03 - 0.015) + 0.015 * Math.cos((2 * Math.PI * t) / 14.0)) * height * intensityFactor;
      break;
    case 'pulse':
      bgScale = 1.06 + 0.04 * Math.sin((2 * Math.PI * t) / 2.5) * intensityFactor;
      break;
    default:
      bgScale = 1.0 + 0.08 * bgProgress * intensityFactor;
      break;
  }

  ctx.save();

  // Apply Ken Burns transform from center
  ctx.translate(width / 2 + bgOffsetX, height / 2 + bgOffsetY);
  ctx.scale(bgScale, bgScale);
  ctx.translate(-width / 2, -height / 2);

  // Color grade filter applied to background image
  const sat = grade.saturation ?? 1.0;
  const con = grade.contrast ?? 1.0;
  const bri = grade.brightness ?? 1.0;
  const blurPx = Math.round(48 * (width / 1920));

  ctx.filter = `blur(${blurPx}px) saturate(${sat}) contrast(${con}) brightness(${bri})`;

  if (state.cover) {
    const img = state.cover;
    const imgW = (img as HTMLImageElement).naturalWidth || img.width || 512;
    const imgH = (img as HTMLImageElement).naturalHeight || img.height || 512;
    const imgAspect = imgW / imgH;
    const canvasAspect = width / height;

    let drawW: number, drawH: number, dx: number, dy: number;
    if (imgAspect > canvasAspect) {
      drawH = height + blurPx * 2;
      drawW = drawH * imgAspect;
      dx = (width - drawW) / 2;
      dy = -blurPx;
    } else {
      drawW = width + blurPx * 2;
      drawH = drawW / imgAspect;
      dx = -blurPx;
      dy = (height - drawH) / 2;
    }

    try {
      ctx.drawImage(img, dx, dy, drawW, drawH);
    } catch {
      drawFallbackBackground(ctx, width, height, mood);
    }
  } else {
    drawFallbackBackground(ctx, width, height, mood);
  }

  ctx.restore();

  // Darkening overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // -------------------------------------------------------------
  // b) COLOR GRADE: Warmth overlay rectangle
  // -------------------------------------------------------------
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const warmthAlpha = Math.min(0.25, Math.max(0.05, (grade.warmth - 1.0) * 0.3 + 0.1));
  ctx.fillStyle = mood.palette[0] || '#ff4d6d';
  ctx.globalAlpha = warmthAlpha;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Retrieve energy at time t
  let energyData: FrameEnergy | null = state.energy || null;
  if (!energyData && state.getEnergy) {
    energyData = state.getEnergy(t);
  }
  const bassVal = energyData ? energyData.bass : 0;

  // -------------------------------------------------------------
  // c) HERO ART: Sharp cover image with breathing + vertical float + beat pulse
  // -------------------------------------------------------------
  ctx.save();

  let heroSize: number;
  let heroX: number;
  let heroY: number;
  const scale = isPortrait ? width / 1080 : height / 1080;

  if (!isPortrait) {
    // 16:9 layout
    heroSize = Math.round(620 * scale);
    heroX = Math.round((width - heroSize) / 2);
    heroY = Math.round(height * 0.46 - heroSize / 2);
  } else {
    // 9:16 layout - moves up
    heroSize = Math.round(720 * scale);
    heroX = Math.round((width - heroSize) / 2);
    heroY = Math.round(height * 0.38 - heroSize / 2);
  }

  const radius = Math.round(24 * scale);

  // Hero independent motion (3s breathing loop + 6s vertical float + bass beat pulse up to +0.02)
  const heroBreath = 0.006 * (1.0 + Math.sin((2 * Math.PI * t) / 3.0)) * intensityFactor;
  const beatScalePulse = bassVal * 0.02 * intensityFactor;
  const heroBreathingScale = 1.0 + heroBreath + beatScalePulse;
  const heroFloatY = 5.0 * Math.sin((2 * Math.PI * t) / 6.0) * scale * intensityFactor;

  const heroCenterX = heroX + heroSize / 2;
  const heroCenterY = heroY + heroSize / 2 + heroFloatY;

  ctx.translate(heroCenterX, heroCenterY);
  ctx.scale(heroBreathingScale, heroBreathingScale);
  ctx.translate(-heroCenterX, -(heroY + heroSize / 2));

  // Soft drop shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = Math.round(60 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(12 * scale);

  // Draw rounded card background to cast shadow
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(heroX, heroY, heroSize, heroSize, radius);
  } else {
    ctx.rect(heroX, heroY, heroSize, heroSize);
  }
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  // Reset shadow before clipping image
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Clip rounded rect
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(heroX, heroY, heroSize, heroSize, radius);
  } else {
    ctx.rect(heroX, heroY, heroSize, heroSize);
  }
  ctx.clip();

  if (state.cover) {
    try {
      ctx.drawImage(state.cover, heroX, heroY, heroSize, heroSize);
    } catch {
      drawFallbackSquare(ctx, heroX, heroY, heroSize, mood);
    }
  } else {
    drawFallbackSquare(ctx, heroX, heroY, heroSize, mood);
  }
  ctx.restore();

  // Border ring around hero art
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(heroX, heroY, heroSize, heroSize, radius);
  } else {
    ctx.rect(heroX, heroY, heroSize, heroSize);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = Math.max(1, Math.round(2 * scale));
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // -------------------------------------------------------------
  // VISUALIZER LAYER (64 Bars / Waveline / None)
  // Sit behind text at globalAlpha = 0.55
  // -------------------------------------------------------------
  const visStyle = state.visualizerStyle ?? 'Bars';
  if (visStyle !== 'None' && energyData) {
    const barValues = energyData.bars;
    const startX = isPortrait ? Math.round(80 * (width / 1080)) : Math.round(110 * (width / 1920));
    const endX = width - startX;
    const totalWidth = endX - startX;
    const yBottom = isPortrait ? Math.round(height - 240 * (height / 1920)) : Math.round(height - 70 * (height / 1080));
    const maxBarHeight = Math.round(130 * scale);
    const gap = Math.max(1, Math.round(3 * scale));
    const barWidth = Math.max(1, (totalWidth - 63 * gap) / 64);

    ctx.save();
    ctx.globalAlpha = 0.55;

    const barGrad = ctx.createLinearGradient(0, yBottom, 0, yBottom - maxBarHeight);
    barGrad.addColorStop(0, mood.palette[0] || '#22d3ee');
    barGrad.addColorStop(1, mood.palette[1] || mood.palette[0] || '#3b82f6');

    if (visStyle === 'Bars') {
      ctx.fillStyle = barGrad;
      for (let b = 0; b < 64; b++) {
        const bx = startX + b * (barWidth + gap);
        const barVal = barValues[b] || 0;
        const bh = Math.max(2 * scale, barVal * maxBarHeight * intensityFactor);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx, yBottom - bh, barWidth, bh, [Math.round(3 * scale), Math.round(3 * scale), 0, 0]);
        } else {
          ctx.rect(bx, yBottom - bh, barWidth, bh);
        }
        ctx.fill();
      }
    } else if (visStyle === 'Waveline') {
      ctx.strokeStyle = barGrad;
      ctx.lineWidth = Math.max(2, Math.round(3 * scale));
      ctx.beginPath();
      for (let b = 0; b < 64; b++) {
        const bx = startX + b * (barWidth + gap) + barWidth / 2;
        const barVal = barValues[b] || 0;
        const bh = Math.max(2 * scale, barVal * maxBarHeight * intensityFactor);
        const by = yBottom - bh;
        if (b === 0) ctx.moveTo(bx, by);
        else ctx.lineTo(bx, by);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // d) TEXT BLOCK - LOWER THIRD, left aligned, with intro slide + fade
  // -------------------------------------------------------------
  ctx.save();

  let startX: number;
  let channelY: number;
  let titleY: number;
  let artistY: number;
  let maxTitleWidth: number;

  if (!isPortrait) {
    // 16:9 layout
    startX = Math.round(110 * (width / 1920));
    channelY = Math.round(790 * (height / 1080));
    titleY = Math.round(880 * (height / 1080));
    artistY = Math.round(940 * (height / 1080));
    maxTitleWidth = Math.round(1500 * (width / 1920));
  } else {
    // 9:16 layout - sits lower
    startX = Math.round(80 * (width / 1080));
    channelY = Math.round(1520 * (height / 1920));
    titleY = Math.round(1620 * (height / 1920));
    artistY = Math.round(1700 * (height / 1920));
    maxTitleWidth = Math.round(width - 160 * (width / 1080));
  }

  const burmeseFontStack = `'Padauk', 'Noto Sans Myanmar', sans-serif`;

  // Intro text animation (0s to 1.2s): slide up 24px + fade in
  // Channel starts at t=0s, Title at t=0.1s, Artist at t=0.25s (0.15s later)
  const channelStart = 0.0;
  const channelProg = Math.max(0, Math.min(1, (t - channelStart) / 0.8));
  const channelEase = easeInOutSine(channelProg);
  const channelAlpha = channelEase;
  const channelOffsetY = (1.0 - channelEase) * 24 * scale;

  const titleStart = 0.1;
  const titleProg = Math.max(0, Math.min(1, (t - titleStart) / 0.8));
  const titleEase = easeInOutSine(titleProg);
  const titleAlpha = titleEase;
  const titleOffsetY = (1.0 - titleEase) * 24 * scale;

  const artistStart = titleStart + 0.15; // 0.25s
  const artistProg = Math.max(0, Math.min(1, (t - artistStart) / 0.8));
  const artistEase = easeInOutSine(artistProg);
  const artistAlpha = artistEase;
  const artistOffsetY = (1.0 - artistEase) * 24 * scale;

  // 1. Channel Name
  const channelFontSize = Math.round(30 * scale);
  const accentColor = mood.palette[0] || '#22d3ee';
  ctx.save();
  ctx.globalAlpha = channelAlpha;
  ctx.font = `700 ${channelFontSize}px 'Space Grotesk', ${burmeseFontStack}`;
  ctx.fillStyle = accentColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const channelText = (state.channel || 'MUSIC CHANNEL').toUpperCase();
  ctx.fillText(channelText, startX, channelY + channelOffsetY);
  ctx.restore();

  // 2. Song Title (auto-shrink font size to fit width)
  const initialTitleSize = Math.round(76 * scale);
  const minTitleSize = Math.round(28 * scale);
  let titleFontSize = initialTitleSize;
  const titleFontFamily = mood.type.titleFont || 'Playfair Display, serif';
  const titleWeight = mood.type.weight || '700';

  ctx.font = `${titleWeight} ${titleFontSize}px ${titleFontFamily}, ${burmeseFontStack}`;
  const titleText = state.title || 'Untitled Track';

  while (ctx.measureText(titleText).width > maxTitleWidth && titleFontSize > minTitleSize) {
    titleFontSize -= 2;
    ctx.font = `${titleWeight} ${titleFontSize}px ${titleFontFamily}, ${burmeseFontStack}`;
  }

  // Text shadow for title
  ctx.save();
  ctx.globalAlpha = titleAlpha;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = Math.round(10 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(3 * scale);
  ctx.fillStyle = mood.type.titleColor || '#ffffff';
  ctx.fillText(titleText, startX, titleY + titleOffsetY);
  ctx.restore();

  // 3. Artist Name
  const artistFontSize = Math.round(40 * scale);
  ctx.save();
  ctx.globalAlpha = artistAlpha * 0.75;
  ctx.font = `500 ${artistFontSize}px 'Plus Jakarta Sans', ${burmeseFontStack}`;
  ctx.fillStyle = mood.type.subColor || 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(state.artist || 'Unknown Artist', startX, artistY + artistOffsetY);
  ctx.restore();

  ctx.restore();

  // -------------------------------------------------------------
  // e) VIGNETTE: Radial gradient from transparent center to dark edges + bass pulse
  // -------------------------------------------------------------
  ctx.save();
  const rx = width / 2;
  const ry = height / 2;
  const maxR = Math.hypot(rx, ry);
  const vignetteGrad = ctx.createRadialGradient(rx, ry, maxR * 0.35, rx, ry, maxR);
  const vignetteAlpha = Math.min(0.9, (grade.vignette ?? 0.35) + bassVal * 0.1 * intensityFactor);
  vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`);

  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // -------------------------------------------------------------
  // f) FILM GRAIN: Shimmering noise pattern with offset
  // -------------------------------------------------------------
  const grainPattern = getNoisePattern(ctx);
  if (grainPattern && (grade.grain ?? 0) > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = Math.min(0.4, (grade.grain ?? 0.15) * 0.8);

    // Shift noise pattern offset every frame (30fps step) to shimmer
    const frameSeed = Math.floor(t * 30);
    const offsetX = (frameSeed * 167) % 256;
    const offsetY = (frameSeed * 223) % 256;

    ctx.translate(offsetX, offsetY);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(-offsetX, -offsetY, width + 256, height + 256);
    ctx.restore();
  }

  // -------------------------------------------------------------
  // g) INTRO (0.0 - 1.2s) & OUTRO (last 1.5s) Fade to Black
  // -------------------------------------------------------------
  let fadeAlpha = 0;
  if (t < 1.2) {
    fadeAlpha = 1.0 - Math.max(0, t / 1.2);
  } else if (duration > 0 && t > duration - 1.5) {
    fadeAlpha = Math.min(1.0, (t - (duration - 1.5)) / 1.5);
  }

  if (fadeAlpha > 0) {
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = Math.min(1.0, Math.max(0, fadeAlpha));
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
}

function drawFallbackBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mood: Mood
) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, mood.palette[0] || '#1e3a8a');
  grad.addColorStop(0.5, mood.palette[1] || '#0f172a');
  grad.addColorStop(1, mood.palette[2] || '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function drawFallbackSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  mood: Mood
) {
  const grad = ctx.createRadialGradient(
    x + size / 2,
    y + size / 2,
    size * 0.1,
    x + size / 2,
    y + size / 2,
    size * 0.6
  );
  grad.addColorStop(0, mood.palette[0]);
  grad.addColorStop(0.5, mood.palette[1]);
  grad.addColorStop(1, mood.palette[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, size, size);
}
