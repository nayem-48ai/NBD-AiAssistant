
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Sparkles, Download, RefreshCw, Upload, Wand2 } from 'lucide-react';
import { processImage } from '../services/geminiService';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBaseImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const url = await processImage(prompt, aspectRatio, baseImage || undefined);
      setImageUrl(url);
    } catch (error) {
      console.error(error);
      alert("AI Processing Failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-8 space-y-6 sm:space-y-8 max-w-6xl mx-auto overflow-y-auto custom-scrollbar bg-transparent">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg"><ImageIcon className="text-indigo-500" /></div>
             <h1 className="text-2xl sm:text-3xl font-bold dark:text-white text-slate-900 tracking-tight">Creative Studio</h1>
          </div>
          <p className="dark:text-slate-400 text-slate-500 font-medium text-sm">Visualize anything with NBD Nano Banana AI.</p>
        </div>
        
        <div className="flex dark:bg-white/5 bg-slate-100 border dark:border-white/10 border-slate-200 p-1 rounded-2xl gap-1 w-fit">
           {["1:1", "16:9", "9:16"].map(ratio => (
             <button 
               key={ratio} 
               onClick={() => setAspectRatio(ratio)}
               className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                 aspectRatio === ratio ? 'bg-blue-600 text-white shadow-md' : 'dark:text-slate-500 text-slate-400 hover:text-slate-700'
               }`}
             >
               {ratio}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 flex-1">
        <div className="space-y-6">
          <div className="dark:bg-slate-800/40 bg-white p-5 sm:p-6 rounded-3xl space-y-6 border dark:border-white/10 border-slate-100 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold dark:text-slate-500 text-slate-400 uppercase tracking-widest">Image Reference</label>
                {baseImage && <button onClick={() => setBaseImage(null)} className="text-[10px] text-red-500 font-bold hover:underline tracking-widest">REMOVE</button>}
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative h-40 sm:h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer overflow-hidden ${
                  baseImage ? 'border-blue-500/50' : 'dark:border-white/10 border-slate-200 dark:bg-white/5 bg-slate-50 hover:border-blue-500/30'
                }`}
              >
                <input type="file" ref={fileInputRef} onChange={handleFile} accept="image/*" className="hidden" />
                {baseImage ? (
                  <img src={baseImage} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="text-slate-400 mb-2" size={24} />
                    <p className="text-sm font-semibold text-slate-500">Upload to edit</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black mt-1">Optional Reference</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-bold dark:text-slate-500 text-slate-400 uppercase tracking-widest">
                AI Intent
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={baseImage ? "Instruction: 'Make background futuristic'..." : "Prompt: 'A lush oasis on a distant moon'..."}
                className="w-full h-28 sm:h-32 dark:bg-slate-900/50 bg-slate-50 border dark:border-white/10 border-slate-200 rounded-2xl p-4 sm:p-5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none text-sm font-medium leading-relaxed dark:text-white text-slate-800"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:scale-[0.99] active:scale-[0.97] disabled:from-slate-300 dark:disabled:from-slate-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg"
            >
              {isGenerating ? <RefreshCw className="animate-spin" size={20} /> : (baseImage ? <Wand2 size={20} /> : <Sparkles size={20} />)}
              {isGenerating ? 'Synthesizing...' : (baseImage ? 'Apply AI Edit' : 'Generate Asset')}
            </button>
          </div>
        </div>

        <div className="relative h-full min-h-[300px] lg:min-h-0">
          <div className="h-full dark:bg-slate-800/20 bg-slate-100 rounded-3xl border dark:border-white/10 border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
            {imageUrl ? (
              <div className="group w-full h-full relative flex items-center justify-center p-2">
                <img src={imageUrl} alt="Result" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-6 p-4 text-center">
                   <div className="p-3 dark:bg-white/5 bg-white/10 rounded-xl border border-white/10 max-w-[80%]">
                      <p className="text-xs text-white leading-relaxed font-medium italic">"{prompt}"</p>
                   </div>
                   <div className="flex flex-wrap justify-center gap-3">
                      <a href={imageUrl} download="nbd-vision.png" className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-xs font-bold text-white shadow-xl hover:bg-blue-500 transition-colors"><Download size={16} /> DOWNLOAD</a>
                      <button onClick={handleGenerate} className="p-3 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all"><RefreshCw size={18} /></button>
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 max-w-xs p-8 opacity-40">
                <div className="mx-auto w-16 h-16 rounded-full dark:bg-white/5 bg-slate-200 flex items-center justify-center border dark:border-white/10 border-slate-300"><ImageIcon size={28} className="text-slate-400" /></div>
                <div>
                   <h3 className="font-bold dark:text-slate-300 text-slate-700">Studio Ready</h3>
                   <p className="text-xs text-slate-500 mt-1">Generated visuals will appear here.</p>
                </div>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 dark:bg-slate-950/70 bg-white/70 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                 <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={24} />
                 </div>
                 <div className="text-center">
                    <p className="text-blue-600 dark:text-blue-400 font-black tracking-[0.2em] text-[10px] uppercase">Processing Pixels</p>
                    <p className="dark:text-slate-500 text-slate-400 text-[9px] font-bold mt-1 tracking-tighter uppercase">Flash 2.5 Image Engine</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
