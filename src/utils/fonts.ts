/**
 * Ensures Burmese and Mood Google Fonts are fully loaded into the browser
 * before canvas drawing operations commence.
 */
export async function ensureFontsLoaded(): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return true;
  }

  try {
    // Wait for document fonts API to resolve
    await document.fonts.ready;
    return true;
  } catch (err) {
    console.warn('Font loading warning:', err);
    return false;
  }
}
