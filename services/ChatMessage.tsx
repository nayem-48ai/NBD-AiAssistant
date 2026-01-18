
import React, { useState, useCallback, useMemo } from 'react';
import { Message } from '../types';
import { Bot, User, ExternalLink, Copy, Check, Edit3, X, Save, RotateCcw, ChevronRight, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onEdit?: (newText: string) => void;
  onContinue?: () => void;
  isLast?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onEdit, onContinue, isLast }) => {
  const isModel = message.role === 'model';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  // টেক্সট থেকে মারকডাউন (যেমন ** বা __) ক্লিন করার ফাংশন
  const cleanText = useMemo(() => {
    if (!message.text) return "";
    // Regex ব্যবহার করে মারকডাউন সিম্বলগুলো রিমুভ করা হচ্ছে
    return message.text.replace(/\*\*(.*?)\*\*/g, '$1')
                      .replace(/__(.*?)__/g, '$1')
                      .replace(/\*(.*?)\*/g, '$1');
  }, [message.text]);

  const handleCopy = useCallback(() => {
    if (!cleanText) return;
    navigator.clipboard.writeText(cleanText)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => {
        const area = document.createElement('textarea');
        area.value = cleanText;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }, [cleanText]);

  const handleSaveEdit = () => {
    if (editText.trim() !== message.text && onEdit) onEdit(editText);
    setIsEditing(false);
  };

  const isTruncated = () => {
    if (!isModel || !isLast) return false;
    const hasUnclosedCodeBlock = (message.text.match(/```/g) || []).length % 2 !== 0;
    const isVeryLong = message.text.length > 2500;
    const endsAbruptly = message.text.length > 0 && !/[.!?।]$/.test(message.text.trim());
    return hasUnclosedCodeBlock || (isVeryLong && endsAbruptly);
  };

  const shouldShowContinue = isTruncated();

  return (
    <div className={`flex w-full ${isModel ? 'justify-start' : 'justify-end animate-in fade-in slide-in-from-bottom-2 duration-300'}`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-3 sm:gap-4 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center mt-1 border shadow-sm ${
          isModel ? 'dark:bg-blue-600/10 bg-blue-50 dark:border-blue-500/30 border-blue-200 text-blue-600 dark:text-blue-400' 
                  : 'dark:bg-slate-800 bg-slate-100 dark:border-white/10 border-slate-200 text-slate-500'
        }`}>
          {isModel ? <Bot size={18} /> : <User size={18} />}
        </div>
        
        <div className={`flex flex-col gap-2 ${isModel ? 'items-start' : 'items-end'} w-full`}>
          <div className={`group relative w-full shadow-lg transition-all ${
            isModel ? 'dark:bg-slate-800/95 bg-white dark:text-slate-100 text-slate-800 border dark:border-white/5 border-slate-100 rounded-2xl sm:rounded-3xl rounded-tl-none px-4 py-3 sm:px-5 sm:py-4' 
                    : 'bg-blue-600 text-white rounded-2xl sm:rounded-3xl rounded-tr-none px-4 py-3 sm:px-5 sm:py-4'
          }`}>
            {message.image && (
              <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/10">
                <img src={message.image} alt="Content" className="max-h-60 sm:max-h-96 w-auto object-contain mx-auto" />
              </div>
            )}
            
            {isEditing ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-200 py-1">
                <div className="overflow-hidden rounded-2xl border-2 border-blue-500/30 dark:bg-black/40 bg-white shadow-2xl transition-all focus-within:ring-4 ring-blue-500/10">
                  <div className="flex items-center justify-between px-4 py-2 bg-blue-500/10 border-b border-blue-500/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Edit3 size={12} /> এডিট মোড অ্যাক্টিভ
                    </span>
                    <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                  </div>
                  <textarea 
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm sm:text-base min-h-[180px] p-4 dark:text-white text-slate-900 resize-none font-medium custom-scrollbar"
                    autoFocus
                  />
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[10px] text-slate-400 font-bold italic">মডিফিকেশন হিস্ট্রিতে সেভ হবে না।</p>
                    <div className="flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">বাতিল</button>
                      <button onClick={handleSaveEdit} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95">
                        <Save size={14}/> আপডেট করুন
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed font-medium text-sm sm:text-base selection:bg-blue-500/20">
                {cleanText}
              </div>
            )}

            {!isEditing && (
              <div className={`absolute -bottom-4 ${isModel ? 'right-0' : 'left-0'} flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 z-20`}>
                <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-slate-700 bg-white border dark:border-white/10 border-slate-200 rounded-xl dark:text-slate-300 text-slate-500 hover:text-blue-500 transition-all shadow-xl active:scale-95">
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span className="text-[10px] font-black uppercase tracking-widest">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {!isModel && onEdit && (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-slate-700 bg-white border dark:border-white/10 border-slate-200 rounded-xl dark:text-slate-300 text-slate-500 hover:text-blue-500 transition-all shadow-xl active:scale-95">
                    <Edit3 size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Edit</span>
                  </button>
                )}
                {shouldShowContinue && onContinue && (
                  <button onClick={onContinue} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all shadow-xl active:scale-95 animate-pulse">
                    <ChevronRight size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Continue</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {message.groundingLinks && message.groundingLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.groundingLinks.map((link, idx) => (
                <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-emerald-500/10 bg-emerald-50 hover:bg-emerald-100 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 transition-all font-bold shadow-sm">
                  <ExternalLink size={10} /> {link.title.length > 25 ? link.title.substring(0, 25) + '...' : link.title}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3 px-1 mt-1 opacity-60">
            <span className="text-[9px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-[0.2em]">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
