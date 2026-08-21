/**
 * Utility to load an HTMLImageElement asynchronously for canvas rendering.
 */
const imageCache = new Map<string, HTMLImageElement>();

export function loadCanvasImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);

  if (imageCache.has(url)) {
    const cached = imageCache.get(url)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      console.warn('Failed to load cover image for canvas:', url);
      resolve(null);
    };

    img.src = url;
  });
}
