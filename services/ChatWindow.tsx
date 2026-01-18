
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Globe, Trash2, Sparkles, BrainCircuit, Zap, Image as ImageIcon, X, Plus, Bot, Command, ArrowRight, Edit3, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { Message, GroundingLink, ChatSession } from '../types';
import ChatMessage from './ChatMessage';
import { chatWithGeminiStream, processImage } from '../services/geminiService';

interface ChatWindowProps {
  activeSession: ChatSession | null;
  onUpdateSession: (id: string, updates: Partial<ChatSession>) => void;
  onCreateFirstChat: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeSession, onUpdateSession, onCreateFirstChat }) => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [activeSession?.messages, isGenerating, scrollToBottom]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (overrideInput?: string, overrideHistory?: Message[], isContinue = false) => {
    if (!activeSession) { onCreateFirstChat(); return; }
    setErrorMsg(null);

    const finalInput = isContinue 
      ? "Please continue exactly from where you left off, finishing any incomplete sentences or code blocks." 
      : (overrideInput !== undefined ? overrideInput : input);
    
    if ((!finalInput.trim() && !selectedImage) || isGenerating) return;

    const userMessage: Message | null = isContinue ? null : {
      id: Date.now().toString(),
      role: 'user',
      text: finalInput,
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    const baseHistory = overrideHistory !== undefined ? overrideHistory : activeSession.messages;
    const updatedMessages = userMessage ? [...baseHistory, userMessage] : baseHistory;
    
    if (userMessage) {
      let newTitle = activeSession.title;
      if (baseHistory.length === 0 && finalInput.trim()) {
        newTitle = finalInput.length > 40 ? finalInput.substring(0, 40) + '...' : finalInput;
      }
      onUpdateSession(activeSession.id, { messages: updatedMessages, title: newTitle });
    }
    
    if (!isContinue) setInput('');
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsGenerating(true);

    try {
      const history = updatedMessages.slice(-15).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const streamResponse = await chatWithGeminiStream(finalInput, history, {
        useSearch: activeSession.config.useSearch,
        useThinking: activeSession.config.useThinking,
        useFast: activeSession.config.useFast,
        image: currentImage || undefined
      });

      const lastMsg = activeSession.messages[activeSession.messages.length - 1];
      const botMessageId = (isContinue && lastMsg?.role === 'model') ? lastMsg.id : (Date.now() + 1).toString();
      
      let botText = (isContinue && lastMsg?.role === 'model') ? lastMsg.text : "";
      let groundingLinks: GroundingLink[] = (isContinue && lastMsg?.role === 'model') ? (lastMsg.groundingLinks || []) : [];
      
      let finalBotMessage: Message = { id: botMessageId, role: 'model', text: botText, timestamp: new Date() };

      for await (const chunk of streamResponse) {
        if (chunk.candidates?.[0]?.content?.parts.some(p => p.functionCall)) {
          const call = chunk.candidates[0].content.parts.find(p => p.functionCall)?.functionCall;
          if (call?.name === 'generate_image') {
            const prompt = (call.args as any).prompt;
            onUpdateSession(activeSession.id, { messages: [...updatedMessages, { ...finalBotMessage, text: "🎨 দৃশ্য তৈরি করা হচ্ছে..." }] });
            try {
              const generatedUrl = await processImage(prompt, (call.args as any).aspect_ratio || "1:1");
              finalBotMessage = { ...finalBotMessage, text: `আপনার জন্য ইমেজটি তৈরি করা হয়েছে: "${prompt}"`, image: generatedUrl };
            } catch {
              finalBotMessage = { ...finalBotMessage, text: "দুঃখিত, ইমেজ জেনারেশনে সমস্যা হয়েছে।" };
            }
            break;
          }
        }

        botText += chunk.text || "";
        const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          const newLinks = chunks.filter((c: any) => c.web).map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
          groundingLinks = [...groundingLinks, ...newLinks];
        }

        finalBotMessage = { ...finalBotMessage, text: botText, groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined };
        onUpdateSession(activeSession.id, {
          messages: (isContinue && lastMsg?.role === 'model') ? [...updatedMessages.slice(0, -1), finalBotMessage] : [...updatedMessages, finalBotMessage]
        });
      }
    } catch (error: any) {
      console.error('Generation Error:', error);
      let friendlyError = "নিউরন কানেকশন সাময়িকভাবে বিচ্ছিন্ন হয়েছে।";
      if (error.message.includes("429")) friendlyError = "আপনি খুব দ্রুত রিকোয়েস্ট পাঠাচ্ছেন। ১ মিনিট অপেক্ষা করুন।";
      if (error.message.includes("network")) friendlyError = "ইন্টারনেট সংযোগ চেক করে আবার চেষ্টা করুন।";
      setErrorMsg(friendlyError);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditMessage = (id: string, newText: string) => {
    if (!activeSession) return;
    const msgIndex = activeSession.messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    handleSend(newText, activeSession.messages.slice(0, msgIndex));
  };

  const toggleConfig = (key: keyof ChatSession['config']) => {
    if (!activeSession) return;
    const newConfig = { ...activeSession.config, [key]: !activeSession.config[key] };
    if (key === 'useThinking' && newConfig.useThinking) newConfig.useFast = false;
    if (key === 'useFast' && newConfig.useFast) newConfig.useThinking = false;
    onUpdateSession(activeSession.id, { config: newConfig });
  };

  if (!activeSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center overflow-y-auto">
        <div className="relative group mb-8">
           <div className="absolute -inset-4 bg-blue-600/20 rounded-[3rem] blur-2xl group-hover:bg-blue-600/30 transition-all duration-700" />
           <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center border-4 border-white/10 shadow-2xl animate-in zoom-in-50 duration-500">
             <Bot className="text-white w-14 h-14" />
           </div>
        </div>
        <div className="max-w-xl space-y-4 animate-in slide-in-from-bottom-4 duration-700">
           <h1 className="text-4xl font-black dark:text-white text-slate-900 tracking-tight">Net BD Pro AI</h1>
           <p className="dark:text-slate-400 text-slate-600 text-lg font-medium leading-relaxed">
             হ্যালো! আমি <span className="text-blue-500 font-bold">NBD AI Assistant</span>। আমি কীভাবে সাহায্য করতে পারি?
           </p>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6">
              {["একটি কোডিং প্রজেক্ট প্ল্যান করো", "ভবিষ্যতের ঢাকা শহরের ছবি আঁকো", "কোয়ান্টাম ফিজিক্স সহজ করে বোঝাও", "একটি পেশাদার ইমেইল লিখে দাও"].map((prompt, i) => (
                <button key={i} onClick={() => { onCreateFirstChat(); setInput(prompt); }} className="p-4 rounded-2xl bg-white dark:bg-white/5 border dark:border-white/10 border-slate-200 hover:border-blue-500/50 transition-all text-sm font-semibold dark:text-slate-300 text-slate-700 flex items-center justify-between group shadow-sm">
                  <span className="truncate">{prompt}</span>
                  <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                </button>
              ))}
           </div>
        </div>
        <button onClick={onCreateFirstChat} className="mt-12 flex items-center gap-3 px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black transition-all shadow-2xl shadow-blue-900/30 active:scale-95 group">
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> নতুন সেশন শুরু করুন
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 border-b dark:border-white/5 border-black/5 dark:bg-[#020617]/90 bg-white/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-3 mb-3 sm:mb-0">
          <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20"><Bot size={20} className="text-white" /></div>
          <div className="min-w-0">
            <h2 className="font-bold dark:text-slate-100 text-slate-800 text-sm truncate max-w-[180px] sm:max-w-xs">{activeSession.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[10px] dark:text-slate-500 text-slate-400 uppercase font-black tracking-[0.1em]">Engine: Net BD Pro v3.5</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => toggleConfig('useThinking')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest transition-all border ${activeSession.config.useThinking ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-500 shadow-lg' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400'}`}>
            <BrainCircuit size={10} /> THINKING
          </button>
          <button onClick={() => toggleConfig('useFast')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest transition-all border ${activeSession.config.useFast ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 shadow-lg' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400'}`}>
            <Zap size={10} /> FAST
          </button>
          <button onClick={() => toggleConfig('useSearch')} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[8px] font-black tracking-widest transition-all border ${activeSession.config.useSearch ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 shadow-lg' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-400'}`}>
            <Globe size={10} /> SEARCH
          </button>
          <button onClick={() => onUpdateSession(activeSession.id, { messages: [] })} className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-12 min-h-0 bg-transparent scroll-smooth">
        {activeSession.messages.map((m, idx) => (
          <ChatMessage 
            key={m.id} 
            message={m} 
            onEdit={(text) => handleEditMessage(m.id, text)} 
            onContinue={() => handleSend(undefined, undefined, true)}
            isLast={idx === activeSession.messages.length - 1}
          />
        ))}

        {isGenerating && !activeSession.messages[activeSession.messages.length - 1]?.text && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 shadow-sm"><Sparkles size={18} className="text-blue-500" /></div>
            <div className="bg-slate-100 dark:bg-white/5 border dark:border-white/10 px-5 py-3 rounded-3xl rounded-tl-none shadow-md"><p className="text-xs dark:text-slate-400 italic">প্রসেস করা হচ্ছে...</p></div>
          </div>
        )}

        {errorMsg && (
          <div className="flex justify-center animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm max-w-md shadow-lg backdrop-blur-md">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold">Neural Disrupt: {errorMsg}</p>
                <button onClick={() => handleSend()} className="mt-2 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest hover:underline"><RefreshCw size={10} /> আবার চেষ্টা করুন</button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-6" />
      </div>

      <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t dark:from-[#020617] from-white to-transparent">
        <div className="max-w-4xl mx-auto">
          {selectedImage && (
            <div className="mb-4 relative inline-block group animate-in slide-in-from-bottom-2 duration-300">
              <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-2xl border-4 border-blue-500/30 shadow-2xl" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-xl hover:scale-110 transition-transform"><X size={10} /></button>
            </div>
          )}
          
          <div className="relative group/input shadow-2xl rounded-[2.5rem]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="NBD AI Assistant-কে কিছু জিজ্ঞাসা করুন..."
              className="w-full dark:bg-[#0f172a]/90 bg-white border-2 dark:border-white/10 border-slate-200 rounded-[2.5rem] py-4 pl-7 pr-24 focus:outline-none focus:border-blue-500/50 transition-all text-sm sm:text-base min-h-[60px] max-h-48 custom-scrollbar resize-none font-medium"
              rows={1}
            />
            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-blue-500 transition-all rounded-full hover:bg-blue-500/10 active:scale-95" title="ফাইল আপলোড"><ImageIcon size={20} /></button>
              <button onClick={() => handleSend()} disabled={(!input.trim() && !selectedImage) || isGenerating} className={`p-3 rounded-full w-12 h-12 flex items-center justify-center transition-all ${(!input.trim() && !selectedImage) || isGenerating ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 active:scale-90'}`}>
                <Send size={20} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center mt-3 text-slate-400 font-black uppercase tracking-[0.3em] opacity-40">Net BD Pro Secure AI Layer</p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
