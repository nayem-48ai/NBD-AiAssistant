
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
  const [apiEngine, setApiEngine] = useState(() => localStorage.getItem('nbd_api_engine') || 'API 1');

  useEffect(() => {
    const savedKey = localStorage.getItem('nbd_custom_api_key');
    if (savedKey) setCustomKey(savedKey);
  }, []);

  const handleEngineChange = (engine: string) => {
    setApiEngine(engine);
    localStorage.setItem('nbd_api_engine', engine);
  };

  const saveApiKey = () => {
    if (customKey.trim()) {
      localStorage.setItem('nbd_custom_api_key', customKey.trim());
      alert("Custom API Applied Successfully!");
    } else {
      localStorage.removeItem('nbd_custom_api_key');
      alert("Custom Key Cleared.");
    }
  };

  const engines = ['API 1', 'API 2', 'CUSTOM'];
  const activeIdx = engines.indexOf(apiEngine);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-lg" onClick={() => setIsOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 w-72 h-full flex flex-col border-r border-slate-800/40 bg-[#0b0f1a] transition-all duration-500 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">N</div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight">NBD Studio</h1>
              <p className="text-[9px] uppercase tracking-[0.3em] text-indigo-500 font-black">Net BD Pro AI</p>
            </div>
          </div>

          <button
            onClick={onNewChat}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center gap-3 mb-8 shadow-2xl shadow-indigo-600/20 active:scale-95 group"
          >
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            New Session
          </button>

          <nav className="space-y-1.5">
            {[
              { id: AppMode.CHAT, label: 'Intelligent Chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
              { id: AppMode.IMAGE, label: 'Image Creator', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { id: AppMode.VOICE, label: 'Live Voice', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' }
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); if (window.innerWidth < 1024) setIsOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[13px] font-bold transition-all ${currentMode === m.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={m.icon} /></svg>
                {m.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <p className="px-4 text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4">Chat History</p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${activeSessionId === session.id ? 'bg-slate-800/60 text-white border border-slate-700/30' : 'text-slate-600 hover:bg-slate-800/20 hover:text-slate-400'}`}
                onClick={() => { onSelectSession(session.id); if (window.innerWidth < 1024) setIsOpen(false); }}
              >
                <span className="truncate text-[11px] font-bold w-40">{session.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-700 hover:text-red-500 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 mt-auto border-t border-slate-800/40 backdrop-blur-xl">
          <div className="mb-3">
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-3 px-1 text-center">Engine Control</p>
             <div className="relative flex bg-slate-950 p-1 rounded-2xl border border-slate-800 overflow-hidden">
                <div 
                  className="absolute top-1 bottom-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30"
                  style={{
                    width: 'calc(33.33% - 4px)',
                    transform: `translateX(calc(${activeIdx * 100}% + ${activeIdx === 0 ? '0px' : activeIdx === 1 ? '4px' : '8px'}))`
                  }}
                />
                {engines.map(eng => (
                  <button
                    key={eng}
                    onClick={() => handleEngineChange(eng)}
                    className={`relative z-10 flex-1 py-2 text-[9px] font-black tracking-widest transition-colors duration-300 ${apiEngine === eng ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {eng}
                  </button>
                ))}
             </div>
          </div>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${apiEngine === 'CUSTOM' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-2 py-2">
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Paste API Key..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-indigo-500/50 placeholder-slate-700 font-medium"
              />
              <button
                onClick={saveApiKey}
                className="w-full py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest"
              >
                Link API Engine
              </button>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 py-1.5 opacity-60">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
             <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Powered by Net BD Pro</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
