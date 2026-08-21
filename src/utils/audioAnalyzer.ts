export interface FrameEnergy {
  rms: number;
  bass: number;
  mid: number;
  high: number;
  bars: Float32Array; // 64 frequency bar values (0 to 1)
}

export interface AudioAnalysis {
  fps: number;
  duration: number;
  totalFrames: number;
  bpm: number | null;
  getEnergy: (t: number) => FrameEnergy;
  frames: FrameEnergy[];
}

const DEFAULT_ENERGY: FrameEnergy = {
  rms: 0,
  bass: 0,
  mid: 0,
  high: 0,
  bars: new Float32Array(64),
};

// Standard Cooley-Tukey FFT for 2048 samples
function fft2048(real: Float32Array, imag: Float32Array) {
  const n = 2048;
  // Bit reversal
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      real[i] = real[j];
      real[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Compute FFT
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < halfLen; k++) {
        const posEven = i + k;
        const posOdd = i + k + halfLen;

        const uR = real[posEven];
        const uI = imag[posEven];

        const vR = real[posOdd] * wR - imag[posOdd] * wI;
        const vI = real[posOdd] * wI + imag[posOdd] * wR;

        real[posEven] = uR + vR;
        imag[posEven] = uI + vI;

        real[posOdd] = uR - vR;
        imag[posOdd] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }
}

export async function analyzeAudioFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<AudioAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioCtx.close().catch(() => {});

  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;
  const numChannels = audioBuffer.numberOfChannels;
  const totalLength = audioBuffer.length;

  // 1. Mix down to mono
  const monoData = new Float32Array(totalLength);
  for (let c = 0; c < numChannels; c++) {
    const channelData = audioBuffer.getChannelData(c);
    for (let i = 0; i < totalLength; i++) {
      monoData[i] += channelData[i] / numChannels;
    }
  }

  const fps = 30;
  const totalFrames = Math.max(1, Math.ceil(duration * fps));
  const windowSize = 2048;
  const halfWindow = windowSize / 2;

  // Pre-calculate Hann window
  const hannWindow = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / windowSize));
  }

  // Frequency resolution
  const binResolution = sampleRate / windowSize;
  const bassMinBin = Math.max(1, Math.floor(20 / binResolution));
  const bassMaxBin = Math.min(1023, Math.ceil(250 / binResolution));
  const midMinBin = Math.max(bassMaxBin + 1, Math.floor(250 / binResolution));
  const midMaxBin = Math.min(1023, Math.ceil(2000 / binResolution));
  const highMinBin = Math.max(midMaxBin + 1, Math.floor(2000 / binResolution));
  const highMaxBin = Math.min(1023, Math.ceil(8000 / binResolution));

  // Logarithmic frequency bounds for 64 visualizer bars (20Hz - 10000Hz)
  const barBinIndices: Array<[number, number]> = [];
  const minFreq = 20;
  const maxFreq = 10000;
  for (let b = 0; b < 64; b++) {
    const f1 = minFreq * Math.pow(maxFreq / minFreq, b / 64);
    const f2 = minFreq * Math.pow(maxFreq / minFreq, (b + 1) / 64);
    let bin1 = Math.floor(f1 / binResolution);
    let bin2 = Math.ceil(f2 / binResolution);
    if (bin2 <= bin1) bin2 = bin1 + 1;
    barBinIndices.push([Math.min(1023, bin1), Math.min(1023, bin2)]);
  }

  // Raw series containers
  const rawRms = new Float32Array(totalFrames);
  const rawBass = new Float32Array(totalFrames);
  const rawMid = new Float32Array(totalFrames);
  const rawHigh = new Float32Array(totalFrames);
  const rawBars = Array.from({ length: totalFrames }, () => new Float32Array(64));

  const realBuf = new Float32Array(windowSize);
  const imagBuf = new Float32Array(windowSize);
  const magBuf = new Float32Array(halfWindow);

  for (let f = 0; f < totalFrames; f++) {
    if (f % 150 === 0 && onProgress) {
      onProgress(f / totalFrames);
    }

    const time = f / fps;
    const centerSample = Math.round(time * sampleRate);
    const startSample = centerSample - halfWindow;

    // Window extraction & RMS
    let sumSq = 0;
    for (let i = 0; i < windowSize; i++) {
      const idx = startSample + i;
      const val = idx >= 0 && idx < totalLength ? monoData[idx] : 0;
      sumSq += val * val;
      realBuf[i] = val * hannWindow[i];
      imagBuf[i] = 0;
    }
    rawRms[f] = Math.sqrt(sumSq / windowSize);

    // FFT
    fft2048(realBuf, imagBuf);

    // Magnitudes
    for (let k = 0; k < halfWindow; k++) {
      magBuf[k] = Math.sqrt(realBuf[k] * realBuf[k] + imagBuf[k] * imagBuf[k]) / windowSize;
    }

    // Band energies
    let bSum = 0;
    for (let k = bassMinBin; k <= bassMaxBin; k++) bSum += magBuf[k];
    rawBass[f] = bSum / (bassMaxBin - bassMinBin + 1);

    let mSum = 0;
    for (let k = midMinBin; k <= midMaxBin; k++) mSum += magBuf[k];
    rawMid[f] = mSum / (midMaxBin - midMinBin + 1);

    let hSum = 0;
    for (let k = highMinBin; k <= highMaxBin; k++) hSum += magBuf[k];
    rawHigh[f] = hSum / (highMaxBin - highMinBin + 1);

    // 64 Bar energies
    const barFrame = rawBars[f];
    for (let b = 0; b < 64; b++) {
      const [startK, endK] = barBinIndices[b];
      let sum = 0;
      for (let k = startK; k < endK; k++) {
        sum += magBuf[k];
      }
      barFrame[b] = sum / Math.max(1, endK - startK);
    }
  }

  // Helper for 95th percentile normalization
  function getPercentile95(arr: Float32Array): number {
    const copy = new Float32Array(arr);
    copy.sort();
    const idx = Math.floor(copy.length * 0.95);
    return Math.max(0.0001, copy[idx]);
  }

  const p95Rms = getPercentile95(rawRms);
  const p95Bass = getPercentile95(rawBass);
  const p95Mid = getPercentile95(rawMid);
  const p95High = getPercentile95(rawHigh);

  // 95th percentile per bar
  const p95Bars = new Float32Array(64);
  for (let b = 0; b < 64; b++) {
    const bSeries = new Float32Array(totalFrames);
    for (let f = 0; f < totalFrames; f++) {
      bSeries[f] = rawBars[f][b];
    }
    p95Bars[b] = getPercentile95(bSeries);
  }

  // Smooth series with attack = 0.35, release = 0.08
  const attack = 0.35;
  const release = 0.08;

  const frames: FrameEnergy[] = new Array(totalFrames);
  let prevRms = 0;
  let prevBass = 0;
  let prevMid = 0;
  let prevHigh = 0;
  const prevBars = new Float32Array(64);

  for (let f = 0; f < totalFrames; f++) {
    const normRms = Math.min(1.0, rawRms[f] / p95Rms);
    const normBass = Math.min(1.0, rawBass[f] / p95Bass);
    const normMid = Math.min(1.0, rawMid[f] / p95Mid);
    const normHigh = Math.min(1.0, rawHigh[f] / p95High);

    const smoothRms =
      prevRms + (normRms - prevRms) * (normRms > prevRms ? attack : release);
    const smoothBass =
      prevBass + (normBass - prevBass) * (normBass > prevBass ? attack : release);
    const smoothMid =
      prevMid + (normMid - prevMid) * (normMid > prevMid ? attack : release);
    const smoothHigh =
      prevHigh + (normHigh - prevHigh) * (normHigh > prevHigh ? attack : release);

    prevRms = smoothRms;
    prevBass = smoothBass;
    prevMid = smoothMid;
    prevHigh = smoothHigh;

    const barFrame = new Float32Array(64);
    for (let b = 0; b < 64; b++) {
      const normB = Math.min(1.0, rawBars[f][b] / p95Bars[b]);
      const prevB = prevBars[b];
      const smoothB = prevB + (normB - prevB) * (normB > prevB ? attack : release);
      prevBars[b] = smoothB;
      barFrame[b] = smoothB;
    }

    frames[f] = {
      rms: smoothRms,
      bass: smoothBass,
      mid: smoothMid,
      high: smoothHigh,
      bars: barFrame,
    };
  }

  // Estimate BPM from bass onset autocorrelation
  let bpm: number | null = null;
  try {
    const onsets = new Float32Array(totalFrames);
    for (let f = 1; f < totalFrames; f++) {
      onsets[f] = Math.max(0, rawBass[f] - rawBass[f - 1]);
    }

    // Lags corresponding to 60 BPM (30 frames lag) down to 180 BPM (10 frames lag)
    let bestLag = -1;
    let maxCorr = 0;
    let r0 = 0;
    for (let f = 0; f < totalFrames; f++) r0 += onsets[f] * onsets[f];

    if (r0 > 0.0001) {
      for (let lag = 10; lag <= 30; lag++) {
        let corr = 0;
        for (let f = 0; f < totalFrames - lag; f++) {
          corr += onsets[f] * onsets[f + lag];
        }
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }

      if (bestLag > 0 && maxCorr / r0 > 0.15) {
        bpm = Math.round((60 * fps) / bestLag);
      }
    }
  } catch {
    bpm = null;
  }

  const getEnergy = (t: number): FrameEnergy => {
    if (totalFrames === 0) return DEFAULT_ENERGY;
    const frameIndex = Math.max(0, Math.min(totalFrames - 1, Math.floor(t * fps)));
    return frames[frameIndex] || DEFAULT_ENERGY;
  };

  return {
    fps,
    duration,
    totalFrames,
    bpm,
    getEnergy,
    frames,
  };
}
