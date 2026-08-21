import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check, ShieldAlert, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { LogEntry } from '../types';

interface ConsolePanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleCopy = () => {
    const text = logs.map(l => `[${l.timestamp}] [${(l.type || 'info').toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter(l => filter === 'all' || l.type === filter);

  return (
    <footer
      id="console-panel"
      className="fixed bottom-0 left-0 right-0 z-30 bg-[#020617] border-t border-[#1e293b] shadow-[0_-10px_25px_rgba(0,0,0,0.6)] transition-all duration-300"
    >
      {/* Header bar */}
      <div
        id="console-header"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between cursor-pointer select-none hover:bg-[#161c2d] transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            System Console
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono font-semibold">
            {logs.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleCopy}
                id="console-copy-btn"
                title="Copy log text"
                className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClear}
                id="console-clear-btn"
                title="Clear console"
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            id="console-toggle-btn"
            aria-label={isOpen ? "Collapse console" : "Expand console"}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Log body */}
      {isOpen && (
        <div className="p-3 bg-black/40 font-mono text-xs">
          {/* Filters bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[11px]">
            <div className="flex items-center gap-1.5">
              {(['all', 'info', 'success', 'warn', 'error'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  id={`console-filter-${f}`}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition-colors cursor-pointer ${
                    filter === f
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="text-slate-500 text-[10px]">
              Showing {filteredLogs.length} of {logs.length} entries
            </div>
          </div>

          {/* Log items container */}
          <div
            ref={scrollRef}
            id="console-log-list"
            className="h-32 sm:h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] select-text scrollbar-thin scrollbar-thumb-slate-800"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 italic py-4 text-center">
                Console initialized. Select an audio file to view extraction logs.
              </div>
            ) : (
              filteredLogs.map((log) => {
                let badge = <span className="text-cyan-400 font-bold shrink-0">LOG</span>;
                let textColor = 'text-slate-300';

                if (log.type === 'success') {
                  badge = <span className="text-emerald-500 font-bold shrink-0">SUCCESS</span>;
                  textColor = 'text-emerald-300';
                } else if (log.type === 'warn') {
                  badge = <span className="text-amber-400 font-bold shrink-0">WARN</span>;
                  textColor = 'text-amber-200';
                } else if (log.type === 'error') {
                  badge = <span className="text-rose-400 font-bold shrink-0">ERROR</span>;
                  textColor = 'text-rose-300';
                }

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 hover:bg-slate-900/60 p-1 rounded transition-colors group"
                  >
                    <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                    {badge}
                    <span className={`break-all ${textColor}`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </footer>
  );
};
