
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppMode, ChatSession } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ImageGenerator from './components/ImageGenerator';
import LiveVoice from './components/LiveVoice';
import { Bot, AlertTriangle, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('nbd_theme') !== 'light';
    } catch { return true; }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // থিম এবং বডি ক্লাস ম্যানেজমেন্ট
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem('nbd_theme', isDarkMode ? 'dark' : 'light');
    } catch {}
  }, [isDarkMode]);

  // সেশন ডেটা লোড এবং সেফটি চেক
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('nbd_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt || Date.now()),
            lastMessageAt: new Date(s.lastMessageAt || Date.now()),
            messages: Array.isArray(s.messages) ? s.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp || Date.now())
            })) : []
          }));
        }
      }
    } catch (e) {
      console.error("Storage corruption detected. Starting fresh.");
    }
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    return sessions.length > 0 ? sessions[0].id : null;
  });

  // অটো-সেভ
  useEffect(() => {
    try {
      localStorage.setItem('nbd_history', JSON.stringify(sessions));
    } catch (e) {
      console.warn("Failed to save history.");
    }
  }, [sessions]);

  const activeSession = useMemo(() => {
    if (!currentChatId) return null;
    return sessions.find(s => s.id === currentChatId) || null;
  }, [sessions, currentChatId]);

  const startNewChat = useCallback(() => {
    const newId = Date.now().toString();
    const newChat: ChatSession = {
      id: newId,
      title: 'নতুন চ্যাট',
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date(),
      config: { useSearch: false, useThinking: false, useFast: false }
    };
    setSessions(prev => [newChat, ...prev]);
    setCurrentChatId(newId);
    setMode(AppMode.CHAT);
    setIsMenuOpen(false);
  }, []);

  const deleteChat = (id: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (currentChatId === id) {
        setCurrentChatId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const updateSession = (id: string, updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates, lastMessageAt: new Date() } : s));
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  // যদি অ্যাপ ক্র্যাশ হওয়ার সম্ভাবনা থাকে তবে এরর স্ক্রিন
  if (initError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
        <AlertTriangle size={64} className="text-red-500 mb-4 animate-pulse" />
        <h1 className="text-2xl font-black mb-2 dark:text-white">Neural Sync Lost</h1>
        <p className="text-slate-500 mb-8 text-center max-w-sm">{initError}</p>
        <button onClick={handleReset} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl active:scale-95">
          <RefreshCw size={20} /> Reset Neural System
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden">
      {/* Sidebar for Desktop */}
      <div className="hidden md:flex h-full flex-shrink-0">
        <Sidebar 
          currentMode={mode} 
          setMode={setMode} 
          isDarkMode={isDarkMode} 
          toggleTheme={() => setIsDarkMode(!isDarkMode)} 
          sessions={sessions} 
          currentChatId={currentChatId} 
          onSelectChat={(id) => { setCurrentChatId(id); setMode(AppMode.CHAT); }} 
          onNewChat={startNewChat} 
          onDeleteChat={deleteChat} 
        />
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[999] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar 
              currentMode={mode} 
              setMode={setMode} 
              isDarkMode={isDarkMode} 
              toggleTheme={() => setIsDarkMode(!isDarkMode)} 
              closeMenu={() => setIsMenuOpen(false)} 
              sessions={sessions} 
              currentChatId={currentChatId} 
              onSelectChat={(id) => { setCurrentChatId(id); setMode(AppMode.CHAT); setIsMenuOpen(false); }} 
              onNewChat={startNewChat} 
              onDeleteChat={deleteChat} 
            />
          </div>
        </div>
      )}

      {/* Main UI */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="md:hidden flex-shrink-0 flex items-center justify-between px-6 py-4 border-b dark:border-white/5 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg"><Bot className="text-white w-5 h-5" /></div>
            <span className="font-black tracking-tighter dark:text-white uppercase text-sm">NBD AI</span>
          </div>
          <button onClick={() => setIsMenuOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <div className="flex flex-col gap-1 w-6">
              <span className="h-0.5 w-full bg-current rounded-full"></span>
              <span className="h-0.5 w-full bg-current rounded-full"></span>
              <span className="h-0.5 w-3/4 bg-current rounded-full"></span>
            </div>
          </button>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {mode === AppMode.CHAT && <ChatWindow activeSession={activeSession} onUpdateSession={updateSession} onCreateFirstChat={startNewChat} />}
          {mode === AppMode.IMAGE && <div className="h-full overflow-y-auto"><ImageGenerator /></div>}
          {mode === AppMode.VOICE && <div className="h-full overflow-y-auto"><LiveVoice /></div>}
        </div>
      </main>
    </div>
  );
};

export default App;
