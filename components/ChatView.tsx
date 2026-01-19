
import React, { useState, useRef, useEffect } from 'react';
import { ChatModelMode, Message } from '../types';

interface ChatViewProps {
  messages: Message[];
  onSendMessage: (text: string, image?: string, mode?: ChatModelMode) => void;
  onEditMessage: (id: string, newText: string) => void;
  isLoading: boolean;
  onMenuClick: () => void;
}

const TypewriterText: React.FC<{ text: string; onUpdate: () => void }> = ({ text, onUpdate }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
        onUpdate();
      }, 5);
      return () => clearTimeout(timeout);
    }
  }, [index, text, onUpdate]);

  return <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{displayedText}</p>;
};

const ChatView: React.FC<ChatViewProps> = ({ messages, onSendMessage, onEditMessage, isLoading, onMenuClick }) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [modelMode, setModelMode] = useState<ChatModelMode>(ChatModelMode.FAST);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAutoScrollPaused = useRef(false);

  const scrollToBottom = () => {
    const container = scrollRef.current;
    if (container && !isAutoScrollPaused.current) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      isAutoScrollPaused.current = !isNearBottom;
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedImage) return;
    onSendMessage(inputText, selectedImage || undefined, modelMode);
    setInputText('');
    setSelectedImage(null);
    isAutoScrollPaused.current = false;
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) onEditMessage(id, editValue);
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f1a] text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 bg-[#0b0f1a]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex items-center gap-3">
          {[
            { id: ChatModelMode.FAST, label: 'Fast', color: 'indigo' },
            { id: ChatModelMode.THINKING, label: 'Reasoning', color: 'purple' },
            { id: ChatModelMode.SEARCH, label: 'Search', color: 'blue' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setModelMode(mode.id)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 border ${modelMode === mode.id 
                ? `bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20` 
                : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:text-slate-300'}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="hidden lg:block w-10"></div>
      </header>

      {/* Messages */}
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar"
      >
        <div className="max-w-3xl mx-auto space-y-12 py-6">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-message">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-4xl font-black text-white mb-3">NBD AI Studio</h2>
              <p className="text-slate-500 text-[15px] font-medium max-w-sm mx-auto">Net BD Pro-এর এডভান্সড এআই ইঞ্জিন দ্বারা চালিত।</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`group relative max-w-[90%] md:max-w-[85%] ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
                : 'bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-tl-none'} p-5 transition-all shadow-sm`}>
                
                {msg.image && (
                  <img src={msg.image} alt="Ref" className="max-w-full rounded-xl mb-4 border border-white/10 shadow-lg" />
                )}
                
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-4 min-w-[260px]">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-slate-900 text-white p-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-indigo-500 text-sm resize-none outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditingId(null)} className="text-xs font-bold text-slate-500 hover:text-white transition-colors">Cancel</button>
                      <button onClick={() => saveEdit(msg.id)} className="text-xs bg-indigo-500 text-white px-5 py-2 rounded-lg font-bold shadow-lg hover:bg-indigo-400">Update</button>
                    </div>
                  </div>
                ) : (
                  msg.role === 'assistant' && msg.isNew ? (
                    <TypewriterText text={msg.content} onUpdate={scrollToBottom} />
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px] font-medium">{msg.content}</p>
                  )
                )}

                <div className={`absolute -bottom-8 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'right-0' : 'left-0'}`}>
                  <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-[10px] uppercase font-black text-slate-600 hover:text-indigo-400 tracking-widest">Copy</button>
                  {msg.role === 'user' && (
                    <button onClick={() => { setEditingId(msg.id); setEditValue(msg.content); }} className="text-[10px] uppercase font-black text-slate-600 hover:text-indigo-400 tracking-widest">Edit</button>
                  )}
                </div>

                {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, idx) => (
                      <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-bold hover:bg-indigo-500 hover:text-white transition-all border border-indigo-500/20">
                        🔗 {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 px-3 py-2 bg-slate-800/30 rounded-2xl">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Improved Minimalist Input Area */}
      <div className="px-4 md:px-8 pb-8 pt-2">
        <div className="max-w-3xl mx-auto relative">
          {selectedImage && (
            <div className="absolute bottom-full mb-4 animate-message">
              <div className="relative group">
                <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-2xl border border-slate-700 shadow-2xl ring-4 ring-indigo-500/5" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-[1.8rem] flex items-center gap-1 px-3 py-2 focus-within:border-indigo-500/50 transition-all shadow-2xl backdrop-blur-sm">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 rounded-2xl transition-all flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask NBD AI anything..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] text-white py-3.5 max-h-40 resize-none no-scrollbar placeholder-slate-500 leading-tight font-medium outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} />

            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className={`p-3 rounded-2xl transition-all flex-shrink-0 flex items-center justify-center ${inputText.trim() || selectedImage 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95' 
                : 'text-slate-600 cursor-not-allowed opacity-40'}`}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-600 mt-4 uppercase tracking-[0.4em] font-black pointer-events-none">Net BD Pro AI Engine</p>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
