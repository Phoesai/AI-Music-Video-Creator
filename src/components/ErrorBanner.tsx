import React from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  error: string | null;
  onClear: () => void;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onClear, onRetry }) => {
  if (!error) return null;

  return (
    <div
      role="alert"
      id="global-error-banner"
      className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-200 px-4 py-3 rounded-xl shadow-lg flex items-start justify-between gap-3 transition-all duration-200"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="bg-rose-500 p-1.5 rounded-full shrink-0">
          <AlertTriangle className="w-4 h-4 text-white" />
        </div>
        <div className="space-y-0.5 flex-1 min-w-0">
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
            System Alert
          </span>
          <p className="text-xs sm:text-sm text-rose-200 break-words font-mono">
            {error}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            id="error-banner-retry-btn"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        )}
        <button
          onClick={onClear}
          id="error-banner-close-btn"
          aria-label="Dismiss error banner"
          className="p-1 text-rose-400 hover:text-white rounded-lg hover:bg-rose-900/40 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
