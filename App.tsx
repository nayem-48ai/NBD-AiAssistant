
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ImageStudio from './components/ImageStudio';
import VoiceMode from './components/VoiceMode';
import { AppMode, ChatSession, Message, ChatModelMode } from './types';
import { chatWithGemini } from './services/gemini';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConfigReady, setIsConfigReady] = useState(false);

  useEffect(() => {
    // ১. অ্যাপ ইনিশিয়ালাইজেশন
    const initApp = () => {
      const savedSessions = localStorage.getItem('nbd_sessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        const sanitized = parsed.map((s: ChatSession) => ({
          ...s,
          messages: s.messages.map(m => ({ ...m, isNew: false }))
        }));
        setSessions(sanitized);
        if (sanitized.length > 0) setActiveSessionId(sanitized[0].id);
      } else {
        handleNewChat();
      }
      setIsConfigReady(true);
    };

    initApp();
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('nbd_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setMode(AppMode.CHAT);
    setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setSessions(prev => prev.map(s => ({
      ...s,
      messages: s.messages.map(m => ({ ...m, isNew: false }))
    })));
    setActiveSessionId(id);
    setMode(AppMode.CHAT);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const sendMessage = async (text: string, image?: string, modelMode: ChatModelMode = ChatModelMode.FAST, existingHistory?: Message[]) => {
    if (!activeSessionId || !isConfigReady) return;
    
    setIsLoading(true);
    const baseMessages: Message[] = (existingHistory || activeSession?.messages || []).map(m => ({ ...m, isNew: false }));
    const updatedMessages: Message[] = [...baseMessages];
    
    if (!existingHistory) {
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        image,
        timestamp: Date.now(),
        isNew: false
      };
      updatedMessages.push(userMsg);
    }
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: [...updatedMessages], title: text.slice(0, 30) || s.title } 
        : s
    ));

    try {
      const response = await chatWithGemini(text, updatedMessages, modelMode, image);
      
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        groundingLinks: response.links,
        timestamp: Date.now(),
        isNew: true 
      };

      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: [...updatedMessages, assistantMsg] } 
          : s
      ));
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I encountered an error. Please check your connection or API Key.",
        timestamp: Date.now(),
        isNew: true
      };
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: [...updatedMessages, errorMsg] } 
          : s
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMessage = (id: string, newText: string) => {
    if (!activeSession) return;
    const msgIndex = activeSession.messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    const truncatedHistory = activeSession.messages.slice(0, msgIndex);
    const editedMsg: Message = { ...activeSession.messages[msgIndex], content: newText, isNew: false };
    sendMessage(newText, editedMsg.image, ChatModelMode.FAST, [...truncatedHistory, editedMsg]);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id && updated.length > 0) setActiveSessionId(updated[0].id);
    else if (updated.length === 0) handleNewChat();
  };

  if (!isConfigReady) {
    return (
      <div className="h-screen bg-[#0b0f1a] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Initializing Engine...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0b0f1a] overflow-hidden">
      <Sidebar
        currentMode={mode}
        setMode={setMode}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <main className="flex-1 relative flex flex-col min-w-0">
        {mode === AppMode.CHAT && (
          <ChatView
            messages={activeSession?.messages || []}
            onSendMessage={(text, img, m) => sendMessage(text, img, m)}
            onEditMessage={handleEditMessage}
            isLoading={isLoading}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        )}
        {mode === AppMode.IMAGE && (
          <div className="flex flex-col h-full bg-[#0b0f1a]">
            <header className="lg:hidden p-4 border-b border-slate-800 flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h1 className="ml-2 font-bold text-white">Image Studio</h1>
            </header>
            <ImageStudio />
          </div>
        )}
        {mode === AppMode.VOICE && (
          <div className="flex flex-col h-full relative">
            <header className="lg:hidden p-4 flex items-center absolute top-0 left-0 right-0 z-30">
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white bg-slate-800/50 backdrop-blur-md rounded-xl m-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </header>
            <VoiceMode />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
