
import React, { useState, useEffect } from 'react';
import { AppMode, ChatSession } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  setMode,
  sessions,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  isOpen,
  setIsOpen
}) => {
  const [customKey, setCustomKey] = useState('');
  const [isKeySaved, setIsKeySaved] = useState(false);
  const [activeEngine, setActiveEngine] = useState('System Core');

  useEffect(() => {
    const savedKey = localStorage.getItem('nbd_custom_api_key');
    if (savedKey) {
      setCustomKey(savedKey);
      setIsKeySaved(true);
      setActiveEngine('Custom Mode');
    } else {
      setActiveEngine('System Core');
    }
  }, []);

  const saveApiKey = () => {
    if (customKey.trim()) {
      localStorage.setItem('nbd_custom_api_key', customKey.trim());
      setIsKeySaved(true);
      setActiveEngine('Custom Mode');
      alert("Custom Key applied! Now using your API.");
    } else {
      localStorage.removeItem('nbd_custom_api_key');
      setIsKeySaved(false);
      setActiveEngine('System Core');
      alert("Using System default keys.");
    }
  };

  const handleSelect = (id: string) => {
    onSelectSession(id);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  const handleModeChange = (mode: AppMode) => {
    setMode(mode);
    if (window.innerWidth < 1024) setIsOpen(false);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 h-full flex flex-col border-r border-slate-800 bg-[#0b0f1a] transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">N</div>
            <div>
              <h1 className="font-bold text-lg text-white">NBD AI</h1>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Net BD Pro</p>
            </div>
          </div>

          <button
            onClick={onNewChat}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            New Session
          </button>

          <nav className="space-y-1">
            <button
              onClick={() => handleModeChange(AppMode.CHAT)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentMode === AppMode.CHAT ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              Chat
            </button>
            <button
              onClick={() => handleModeChange(AppMode.IMAGE)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentMode === AppMode.IMAGE ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Image Studio
            </button>
            <button
              onClick={() => handleModeChange(AppMode.VOICE)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${currentMode === AppMode.VOICE ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              Voice Mode
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">History</p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all ${activeSessionId === session.id ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800/40'}`}
                onClick={() => handleSelect(session.id)}
              >
                <span className="truncate text-xs font-bold w-40">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800 mt-auto">
          <div className="mb-4">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">API Control</p>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Custom API Key"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-3 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 transition-all"
              />
              <button
                onClick={saveApiKey}
                className={`w-full py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${isKeySaved ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
              >
                {isKeySaved ? 'Update Custom Key' : 'Apply My Key'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-800/30 rounded-xl border border-slate-700/50">
             <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeEngine === 'Custom Mode' ? 'bg-indigo-400' : 'bg-green-500'}`}></div>
             <div className="flex flex-col">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Active Engine</span>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest truncate">
                  {activeEngine}
                </span>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
