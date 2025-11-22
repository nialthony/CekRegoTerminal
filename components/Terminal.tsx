import React, { useState, useEffect, useRef } from 'react';
import { TerminalLog } from '../types';
import { Terminal as TerminalIcon, ChevronRight, Activity } from 'lucide-react';

interface TerminalProps {
  logs: TerminalLog[];
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onCommand, isProcessing }) => {
  const [input, setInput] = useState('');
  const [loadingFrame, setLoadingFrame] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Moon phase animation frames
  const loadingFrames = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setLoadingFrame(prev => (prev + 1) % loadingFrames.length);
    }, 150);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onCommand(input.trim());
    setInput('');
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="flex flex-col h-full w-full bg-black/80 border border-[var(--terminal-color)] box-glow rounded-md p-4 overflow-hidden text-lg font-mono"
      onClick={handleContainerClick}
    >
      <div className="flex items-center justify-between border-b border-[var(--terminal-color)] pb-2 mb-2 opacity-80">
        <div className="flex items-center gap-2">
          <TerminalIcon size={18} className="text-[var(--terminal-color)]" />
          <span className="uppercase text-sm tracking-widest text-glow">Terminal.exe - Root</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Activity size={14} className="animate-pulse" />
          <span>NET_ACTIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono space-y-2 pr-2 custom-scrollbar">
        {logs.map((log) => (
          <div key={log.id} className={`break-words ${log.type === 'error' ? 'text-red-500' : 'text-[var(--terminal-color)]'}`}>
            <span className="opacity-50 text-xs mr-2">[{log.timestamp.toLocaleTimeString()}]</span>
            {log.type === 'command' && <span className="text-blue-400 font-bold mr-2">{'>'}</span>}
            <span className={log.type === 'analysis' ? 'text-yellow-400' : ''}>
              {log.content}
            </span>
          </div>
        ))}
        {isProcessing && (
          <div className="animate-pulse text-[var(--terminal-color)] opacity-70 flex items-center gap-2">
            <span className="text-xl">{loadingFrames[loadingFrame]}</span> PROCESSING_REQUEST...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex items-center gap-2 border-t border-[var(--terminal-color)] pt-2 opacity-90">
        <ChevronRight size={20} className="text-[var(--terminal-color)] animate-pulse" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[var(--terminal-color)] font-mono placeholder-[var(--terminal-color)]/30"
          placeholder="Enter command (type 'help')..."
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </form>
    </div>
  );
};
