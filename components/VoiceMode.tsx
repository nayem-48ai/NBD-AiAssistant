
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGeminiClient, encodeBase64, decodeBase64, decodeAudioData } from '../services/gemini';
import { Modality } from '@google/genai';

const VoiceMode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [selectedLang, setSelectedLang] = useState('Auto Detection');
  const [isLangOpen, setIsLangOpen] = useState(false);
  
  // শুধুমাত্র ২টি প্রোফেশনাল ভয়েস মডেল
  const voices = [
    { id: 'Zephyr', label: 'Female' },
    { id: 'Puck', label: 'Male' }
  ];

  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('nbd_preferred_voice') || 'Zephyr';
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);

  const languages = [
    'Auto Detection', 'English', 'Bengali', 'Hindi', 'Arabic', 'French', 
    'Spanish', 'German', 'Japanese', 'Chinese', 'Russian', 'Portuguese', 
    'Italian', 'Korean', 'Turkish', 'Vietnamese', 'Thai', 'Dutch', 'Indonesian',
    'Urdu', 'Persian', 'Malay'
  ];

  const handleVoiceChange = (voiceId: string) => {
    if (isActive || isConnecting) return;
    setSelectedVoice(voiceId);
    localStorage.setItem('nbd_preferred_voice', voiceId);
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => {
        try { s.close(); } catch (e) {}
      });
      sessionRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    if (outAudioContextRef.current && outAudioContextRef.current.state !== 'closed') {
      outAudioContextRef.current.close().catch(() => {});
    }
    outAudioContextRef.current = null;

    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();

    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = async () => {
    if (isConnecting || isActive) return;
    setIsConnecting(true);
    
    try {
      const ai = getGeminiClient();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      audioContextRef.current = inCtx;
      outAudioContextRef.current = outCtx;

      // অত্যন্ত নিখুঁত ল্যাঙ্গুয়েজ ইনস্ট্রাকশন
      const langContext = selectedLang === 'Auto Detection' 
        ? "CRITICAL: Listen carefully to the user's spoken language and respond in the EXACT same language and dialect. If they speak Bengali, speak Bengali. If English, speak English. Be a linguistic mirror."
        : `Always speak in ${selectedLang} only. But if the user requests to speak in a language, it will do so, and if you ask to turn it off again, it will revert to the previous language.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            if (!audioContextRef.current) return;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
              
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current.destination);
            setIsConnecting(false);
            setIsActive(true);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outAudioContextRef.current) {
              const ctx = outAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            stopSession();
          },
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice as any } }
          },
          systemInstruction: `You are NBD AI, a natural and efficient voice assistant. ${langContext} Be brief, kind, and professional. Avoid long answers, unless necessary.`
        }
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      setIsConnecting(false);
      alert("Microphone access is required.");
    }
  };

  useEffect(() => {
    return () => stopSession();
  }, [stopSession]);

  const selectedIndex = voices.findIndex(v => v.id === selectedVoice);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0f1a] overflow-hidden relative p-4 md:p-6">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] transition-all duration-1000 ${isActive ? 'bg-indigo-600/30 scale-125' : 'bg-indigo-600/5'}`}></div>
        <div className={`absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[140px] transition-all duration-1000 ${isActive ? 'bg-blue-600/30 scale-125' : 'bg-blue-600/5'}`}></div>
      </div>

      {/* Header */}
      <div className="absolute top-10 md:top-14 text-center z-10 w-full px-4">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">Gemini Live</h1>
        <p className="text-indigo-400 font-black uppercase tracking-[0.6em] text-[9px]">Professional Audio Experience</p>
      </div>

      {/* Control Panel */}
      <div className="absolute top-36 md:top-40 z-20 w-full max-w-[280px] px-4 flex flex-col gap-8">
        
        {/* Language Selection */}
        <div className="flex flex-col items-center relative">
          <label className="text-[10px] text-slate-700 uppercase font-black mb-3 tracking-[0.2em]">Input Language</label>
          <button 
            onClick={() => setIsLangOpen(!isLangOpen)}
            disabled={isActive || isConnecting}
            className="w-full bg-slate-900/60 backdrop-blur-2xl text-white text-[12px] font-black py-4 px-6 rounded-2xl border border-slate-800/80 flex items-center justify-between hover:border-indigo-500/50 transition-all shadow-2xl disabled:opacity-40 group active:scale-95"
          >
            <span className="truncate">{selectedLang}</span>
            <svg className={`w-4 h-4 text-slate-600 transition-transform duration-500 ${isLangOpen ? 'rotate-180 text-indigo-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
          </button>

          {isLangOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)}></div>
              <div className="absolute top-full mt-3 left-0 w-full max-h-[35vh] overflow-y-auto bg-slate-900/95 backdrop-blur-3xl border border-slate-700/50 rounded-2xl p-2 z-50 custom-scrollbar shadow-2xl animate-message border-t-indigo-500/30">
                {languages.map(lang => (
                  <button
                    key={lang}
                    onClick={() => { setSelectedLang(lang); setIsLangOpen(false); }}
                    className={`w-full text-left px-5 py-3.5 rounded-xl text-[12px] font-bold transition-all ${selectedLang === lang ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Dual Switcher */}
        <div className="flex flex-col items-center">
          <label className="text-[10px] text-slate-700 uppercase font-black mb-3 tracking-[0.2em]">Model Voice</label>
          <div className="relative flex bg-slate-950 p-1.5 rounded-full w-full border border-slate-800 shadow-xl overflow-hidden">
            <div 
              className="absolute top-1.5 bottom-1.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-indigo-600 rounded-full shadow-lg"
              style={{
                width: 'calc(50% - 4px)',
                transform: `translateX(calc(${selectedIndex * 100}% + ${selectedIndex === 0 ? '2px' : '2px'}))`
              }}
            />
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => handleVoiceChange(v.id)}
                disabled={isActive || isConnecting}
                className={`relative z-10 flex-1 py-3 text-[11px] font-black uppercase tracking-widest transition-colors duration-300 ${selectedVoice === v.id ? 'text-white' : 'text-slate-600 disabled:opacity-30'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interaction Interaction */}
      <div className="relative flex items-center justify-center mt-36 md:mt-32 scale-[0.85] md:scale-100">
        {isActive && (
          <div className="absolute flex items-center justify-center">
            <div className="absolute w-64 h-64 rounded-full border-2 border-indigo-500/20 animate-[ping_2s_infinite]" />
            <div className="absolute w-80 h-80 rounded-full border-2 border-indigo-500/10 animate-[ping_2.5s_infinite]" />
            <div className="absolute w-[450px] h-[450px] bg-indigo-600/10 rounded-full animate-pulse blur-[100px]" />
          </div>
        )}

        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`relative z-10 w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-700 shadow-2xl ${isActive ? 'bg-indigo-600 shadow-[0_0_150px_rgba(79,70,229,0.6)] scale-110 ring-[12px] ring-indigo-500/10' : 'bg-slate-900/80 hover:bg-slate-800 border-2 border-slate-800 hover:border-indigo-500/40'}`}
        >
          {isConnecting ? (
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className={`p-8 rounded-[3rem] mb-5 transition-all duration-700 shadow-2xl ${isActive ? 'bg-white/15 scale-110 rotate-12' : 'bg-slate-950/60'}`}>
                <svg className={`w-14 h-14 transition-colors duration-700 ${isActive ? 'text-white' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-[12px] font-black uppercase tracking-[0.5em] transition-all duration-700 ${isActive ? 'text-white' : 'text-slate-600'}`}>
                {isActive ? 'Stop Stream' : 'Connect AI'}
              </span>
            </>
          )}
        </button>

        {/* Improved Audio Visualizer */}
        <div className="absolute -bottom-48 w-80 flex items-center justify-center gap-2.5 h-24">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-indigo-500/80 rounded-full transition-all duration-75 ease-out"
              style={{
                height: isActive ? `${Math.max(12, volume * (100 + Math.random() * 200))}px` : '4px',
                opacity: isActive ? 1 : 0.05,
                boxShadow: isActive ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none'
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer Status */}
      <div className="absolute bottom-12 md:bottom-16 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 px-8 py-3 bg-slate-900/40 backdrop-blur-3xl rounded-full border border-slate-800 shadow-2xl">
           <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-green-500 shadow-[0_0_12px_#22c55e] animate-pulse' : 'bg-slate-800'}`}></div>
           <span className="text-slate-600 text-[10px] font-black uppercase tracking-[0.5em]">{isActive ? 'AI is Listening' : 'System Ready'}</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;
