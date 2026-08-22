import React, { useState, useEffect } from 'react';
import { Disc, HelpCircle, X, Music, Palette, Play, Film, Download } from 'lucide-react';

export const Header: React.FC = () => {
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="w-full bg-[#0f172a] border-b border-[#1e293b] sticky top-0 z-40 px-4 py-4 sm:px-8 shadow-md">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-cyan-400 shadow-sm">
            <Disc className="w-6 h-6 animate-spin-slow text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
                AI Music Video Creator
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Client-Side Browser Video Engine • v1.0.5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {deferredPrompt && !isInstalled && (
            <button
              type="button"
              onClick={handleInstallClick}
              id="btn-pwa-install"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold text-xs shadow-md transition-all transform active:scale-95 cursor-pointer"
              title="Install App as PWA"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install App</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            id="btn-header-help"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-400 transition-colors cursor-pointer"
            title="How it works"
          >
            <HelpCircle className="w-4 h-4" />
            <span>How it works</span>
          </button>

          <div className="flex items-center gap-2 bg-[#16a34a]/10 border border-[#16a34a]/30 px-3 py-1 rounded-full shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></div>
            <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest">
              Browser Engine Ready
            </span>
          </div>
        </div>
      </div>

      {/* Help Modal Popover */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161c2d] border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-slate-100">How to Create Your Music Video</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed">
              <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-sm">Step 1: Upload Audio</span>
                  <p className="text-slate-400">
                    Choose an MP3, WAV, or M4A file. Song title, artist name, duration, and embedded ID3 cover art are detected automatically.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-sm">Step 2: Mood & Cover Artwork</span>
                  <p className="text-slate-400">
                    Pick a visual mood (Love, Sad, Cyberpunk, Chill, Dark, EDM) and choose artwork from MP3 ID3, Gemini AI generation, custom image upload, or mood gradient.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-sm">Step 3: Live Preview & Fine-Tune</span>
                  <p className="text-slate-400">
                    Watch a 30 FPS motion preview with beat-synced pulsing, Ken Burns camera pan/zoom, and spectrogram bars. Customize aspect ratio (16:9 widescreen or 9:16 vertical) and motion intensity.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-100 block text-sm">Step 4: Realtime Video Export</span>
                  <p className="text-slate-400">
                    Click Start Export to record a full 1080p WebM music video with synchronized audio directly in your browser. No server processing needed!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

