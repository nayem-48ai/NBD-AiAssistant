
import React from 'react';
import { Image, Mic, Bot, Sun, Moon, X, Plus, Trash2, MessageSquare, Clock, LayoutGrid } from 'lucide-react';
import { AppMode, ChatSession } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  setMode: (mode: AppMode) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  closeMenu?: () => void;
  sessions: ChatSession[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentMode, setMode, isDarkMode, toggleTheme, closeMenu,
  sessions, currentChatId, onSelectChat, onNewChat, onDeleteChat
}) => {
  return (
    <aside className="h-full w-full md:w-72 flex flex-col border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#020617] z-50 shadow-2xl">
      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-xl">
            <Bot className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none dark:text-white text-slate-900">NBD AI</h1>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Net BD Pro</p>
          </div>
        </div>
        {closeMenu && (
          <button onClick={closeMenu} className="md:hidden p-2 text-slate-400">
            <X size={20} />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-6">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-900/10 active:scale-95 group"
        >
          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
          নতুন চ্যাট শুরু করুন
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-8">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <LayoutGrid size={10} /> নেভিগেশন
          </p>
          <button
            onClick={() => { setMode(AppMode.CHAT); closeMenu?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentMode === AppMode.CHAT
                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <MessageSquare size={18} />
            <span className="font-bold text-xs">এআই চ্যাটবট</span>
          </button>
          <button
            onClick={() => { setMode(AppMode.IMAGE); closeMenu?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentMode === AppMode.IMAGE
                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <Image size={18} />
            <span className="font-bold text-xs">ইমেজ স্টুডিও</span>
          </button>
          <button
            onClick={() => { setMode(AppMode.VOICE); closeMenu?.(); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentMode === AppMode.VOICE
                ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <Mic size={18} />
            <span className="font-bold text-xs">ভয়েস মোড</span>
          </button>
        </div>

        {/* History */}
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Clock size={10} /> পূর্বের হিস্ট্রি
          </p>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => onSelectChat(session.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                  currentChatId === session.id && currentMode === AppMode.CHAT
                    ? 'bg-blue-600/5 text-blue-600 dark:text-blue-400 border-blue-600/20'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                <span className="flex-1 font-bold text-[11px] truncate">{session.title}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 rounded-lg transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Settings */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3 bg-slate-50/50 dark:bg-white/5">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 dark:text-slate-400 text-slate-600 hover:bg-white dark:hover:bg-white/10 rounded-xl border border-slate-200 dark:border-white/5 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
            <span className="text-xs font-bold">{isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}</span>
          </div>
          <div className={`w-8 h-4 rounded-full relative p-0.5 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
        </button>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-blue-500/10 bg-blue-500/5">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net BD Pro Engine</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
