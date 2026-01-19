
import React, { useState, useRef, useEffect } from 'react';
import { generateImage } from '../services/gemini';

interface ImageMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  refImage?: string; // ইউজারের দেওয়া রেফারেন্স ইমেজ
}

const ImageStudio: React.FC = () => {
  const [messages, setMessages] = useState<ImageMessage[]>(() => {
    const saved = localStorage.getItem('nbd_image_studio_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('nbd_image_studio_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isGenerating) return;

    const currentInput = input;
    const currentRefImage = selectedImage;

    const userMsg: ImageMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput || "Refining visual details...",
      refImage: currentRefImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    setIsGenerating(true);

    try {
      // রেফারেন্স ইমেজ লজিক: 
      // ইউজার নতুন ছবি দিলে সেটি, নতুবা শেষ জেনারেটেড ছবি অথবা আগের চ্যাটের ছবি রেফারেন্স হিসেবে ব্যবহৃত হবে।
      let referenceToPass = currentRefImage;
      if (!referenceToPass) {
        const lastGenerated = [...messages].reverse().find(m => m.image)?.image;
        const lastRef = [...messages].reverse().find(m => m.refImage)?.refImage;
        referenceToPass = lastGenerated || lastRef;
      }

      const generatedUrl = await generateImage(currentInput || "enhance previous details and refine", aspectRatio, referenceToPass || undefined);

      const assistantMsg: ImageMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Refined to ${aspectRatio} ratio.`,
        image: generatedUrl
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ImageMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Generation failed. Please try again with a clearer prompt."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear image studio history?")) {
      setMessages([]);
      localStorage.removeItem('nbd_image_studio_history');
    }
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nbd-studio-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f1a] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-2xl flex items-center justify-between">
         <div className="flex flex-col">
            <h2 className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Image Core v2.5</h2>
            <p className="text-[12px] text-white font-bold">Net BD Pro Iterative Studio</p>
         </div>
         <div className="flex gap-2">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
               {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                 <button
                   key={ratio}
                   onClick={() => setAspectRatio(ratio)}
                   className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                 >
                   {ratio}
                 </button>
               ))}
            </div>
            <button onClick={clearHistory} className="p-2 text-slate-700 hover:text-red-500 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
         </div>
      </div>

      {/* Main View */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-30 animate-pulse">
             <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <p className="text-[11px] font-black uppercase tracking-[0.4em]">Describe to begin creative session</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-message`}>
            <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-indigo-600/10' : 'bg-slate-800/50 border border-slate-700/50 rounded-2xl rounded-tl-none'} p-5 shadow-2xl transition-all`}>
               {msg.refImage && (
                 <div className="mb-4 relative">
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200 mb-2 opacity-60">Input Reference:</p>
                    <img src={msg.refImage} alt="Ref" className="w-40 h-40 object-cover rounded-xl border border-white/10 shadow-lg bg-slate-900" />
                 </div>
               )}
               <p className="text-[14px] font-medium leading-relaxed mb-4">{msg.content}</p>
               {msg.image && (
                 <div className="relative group rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/10 shadow-2xl">
                    <img src={msg.image} alt="Generated" className="w-full h-auto object-cover max-h-[600px] bg-slate-900" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4 backdrop-blur-sm">
                       <button onClick={() => downloadImage(msg.image!)} className="bg-white text-black p-4 rounded-full hover:scale-110 active:scale-90 transition-transform shadow-xl">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       </button>
                    </div>
                 </div>
               )}
            </div>
            {msg.role === 'assistant' && msg.image && (
              <span className="mt-3 text-[9px] text-slate-600 uppercase font-black tracking-[0.3em] flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Saved to Local Context
              </span>
            )}
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-800/40 border border-slate-700/30 p-5 rounded-2xl rounded-tl-none w-full max-w-[340px] shadow-2xl">
               <div className="bg-slate-950 aspect-square rounded-xl mb-4 flex items-center justify-center border border-slate-800 overflow-hidden relative">
                  <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
                  <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin z-10"></div>
               </div>
               <div className="space-y-3">
                  <div className="h-2.5 bg-slate-700/50 rounded w-full"></div>
                  <div className="h-2.5 bg-slate-700/30 rounded w-2/3"></div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Input */}
      <div className="p-4 md:p-8 bg-gradient-to-t from-[#0b0f1a] via-[#0b0f1a] to-transparent">
        <div className="max-w-3xl mx-auto">
          {selectedImage && (
            <div className="mb-4 flex animate-message">
              <div className="relative group">
                <img src={selectedImage} alt="Preview" className="h-24 w-24 object-cover rounded-2xl border-2 border-indigo-500/30 shadow-2xl" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2.5 -right-2.5 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-[2.5rem] shadow-2xl focus-within:border-indigo-500/40 transition-all backdrop-blur-3xl">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all flex-shrink-0"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="What should I create or edit next?"
              className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] text-white py-4 px-2 resize-none max-h-32 placeholder-slate-700 outline-none font-medium"
              rows={1}
            />
            
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChange} />

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedImage) || isGenerating}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${input.trim() || selectedImage ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95' : 'bg-slate-800 text-slate-700 opacity-20 cursor-not-allowed'}`}
            >
              {isGenerating ? (
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              )}
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-700 mt-5 uppercase tracking-[0.5em] font-black opacity-40">Net BD Pro AI Multimedia Studio</p>
        </div>
      </div>
    </div>
  );
};

export default ImageStudio;
