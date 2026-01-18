
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Shield, Radio, Activity, Power, Headphones, AlertCircle, RefreshCw } from 'lucide-react';
import { GoogleGenAI, Modality, Blob } from '@google/genai';
import { decodeAudioData, encodeBase64, decodeBase64 } from '../services/geminiService';

const LiveVoice: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(30).fill(5));
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateVisualizer = useCallback(() => {
    if (!analyzerRef.current) return;
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    const step = Math.floor(dataArray.length / 30);
    const newData = [];
    for (let i = 0; i < 30; i++) {
      newData.push(Math.max(5, dataArray[i * step] / 2.55));
    }
    setVisualizerData(newData);
    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  }, []);

  const stopSession = useCallback(() => {
    setIsActive(false);
    setStatus('Link Offline');
    setIsModelSpeaking(false);
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    sessionPromiseRef.current?.then(session => {
      try { session.close(); } catch (e) {}
    });
    sessionPromiseRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
      outputContextRef.current.close().catch(() => {});
    }
    
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    setError(null);
    let apiKey = "";
    try { apiKey = (typeof process !== 'undefined') ? (process.env.API_KEY || "") : ""; } catch(e) {}
    
    if (!apiKey) {
      setError("Neural Link Configuration (API Key) is missing.");
      return;
    }

    setIsActive(true);
    setStatus('Linking...');
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();
      
      audioContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      const analyzer = inputCtx.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sourceNode = inputCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyzer);
      
      updateVisualizer();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('Active Sync');
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (!isActive) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              const pcmBlob: Blob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => session && session.sendRealtimeInput({ media: pcmBlob })).catch(() => {});
            };
            sourceNode.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsModelSpeaking(true);
              const ctx = outputContextRef.current;
              if (ctx) {
                if (ctx.state === 'suspended') await ctx.resume();
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                try {
                  const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(ctx.destination);
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
                  source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
                  };
                } catch(e) {}
              }
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsModelSpeaking(false);
            }
          },
          onerror: (e) => {
            setError("Neural link interrupted. Please retry.");
            stopSession();
          },
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: 'You are NBD Neural Voice by Net BD Pro. Strict Rule: DO NOT use markdown characters like ** in your response. Speak naturally in user language. Be brief.'
        }
      });
      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      setError(err.message || "Failed to initialize Vocal Sync.");
      stopSession();
    }
  };

  useEffect(() => () => stopSession(), [stopSession]);

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-transparent">
      <div className="max-w-md w-full relative">
        <div className={`absolute -inset-10 bg-blue-600/10 rounded-full blur-3xl transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
        <div className="relative dark:bg-[#0f172a]/90 bg-white p-10 rounded-[3rem] text-center border dark:border-white/10 border-slate-200 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400'}`}>
              {status}
            </div>
          </div>
          <div className="flex justify-center mb-10">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${isModelSpeaking ? 'bg-blue-600 border-blue-400 shadow-[0_0_50px_rgba(37,99,235,0.4)]' : (isActive ? 'bg-slate-800 border-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 border-transparent')}`}>
              {isModelSpeaking ? <Headphones size={48} className="text-white animate-pulse" /> : <Mic size={48} className={isActive ? "text-blue-500" : "text-slate-400"} />}
            </div>
          </div>
          <div className="flex justify-center items-end gap-1 h-12 mb-10">
            {visualizerData.map((val, i) => (
              <div key={i} className={`w-1 rounded-full transition-all duration-100 ${isActive ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} style={{ height: `${val}%` }} />
            ))}
          </div>
          {error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6 flex flex-col items-center gap-3">
              <p className="text-red-500 text-xs font-bold"><AlertCircle size={14} className="inline mr-2" /> {error}</p>
              <button onClick={startSession} className="text-[10px] font-black uppercase tracking-widest bg-red-500 text-white px-4 py-2 rounded-xl"><RefreshCw size={12} className="inline mr-1" /> Re-Link</button>
            </div>
          ) : (
            <button onClick={isActive ? stopSession : startSession} className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${isActive ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'}`}>
              {isActive ? <><Power size={18} className="inline mr-2" /> Disconnect</> : <><Mic size={18} className="inline mr-2" /> Start Sync</>}
            </button>
          )}
          <div className="mt-8 pt-8 border-t dark:border-white/5 border-slate-100 flex items-center justify-center gap-6 text-[8px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-1"><Shield size={10} /> Secure</div>
            <div className="flex items-center gap-1"><Radio size={10} /> Stereo</div>
            <div className="flex items-center gap-1"><Activity size={10} /> Sync</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveVoice;
