
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getGeminiClient, encodeBase64, decodeBase64, decodeAudioData } from '../services/gemini';
import { Modality } from '@google/genai';

const VoiceMode: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [volume, setVolume] = useState(0);
  const [selectedLang, setSelectedLang] = useState('English');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const languages = [
    'English', 'User Language', 'Bengali', 'Hindi', 'Arabic', 
    'French', 'Spanish', 'German', 'Japanese', 'Chinese', 
    'Russian', 'Portuguese', 'Italian', 'Korean', 'Turkish'
  ];

  const startSession = async () => {
    setIsConnecting(true);
    const ai = getGeminiClient();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
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
              
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
            setIsConnecting(false);
            setIsActive(true);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outCtx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => stopSession(),
          onclose: () => stopSession()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: selectedLang === 'User Language' 
            ? 'You are NBD AI. Respond in the same language the user speaks. Be concise and human-like.' 
            : `You are NBD AI. Respond exclusively in ${selectedLang}. Be concise and professional.`
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err) {
      setIsConnecting(false);
      alert("Microphone access is required.");
    }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) sessionRef.current.then((s: any) => s.close());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
  }, []);

  useEffect(() => () => stopSession(), [stopSession]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0f1a] overflow-hidden relative p-6">
      <div className="absolute top-12 text-center z-10">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Gemini Live</h1>
        <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[10px]">Real-time Voice Mode</p>
      </div>

      {/* Language Selection Dropdown */}
      <div className="absolute top-32 z-20 flex flex-col items-center">
        <label className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Select Language</label>
        <select 
          value={selectedLang}
          onChange={(e) => setSelectedLang(e.target.value)}
          disabled={isActive}
          className="bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-xl border border-slate-700 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
        >
          {languages.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>

      <div className="relative flex items-center justify-center">
        {isActive && (
          <div className="absolute flex items-center justify-center">
            <div className="absolute w-60 h-60 rounded-full border-2 border-indigo-500/10 animate-ping" />
            <div className="absolute w-72 h-72 rounded-full border-2 border-indigo-500/5 animate-ping [animation-delay:0.5s]" />
          </div>
        )}

        <button
          onClick={isActive ? stopSession : startSession}
          disabled={isConnecting}
          className={`relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_50px_rgba(79,70,229,0.3)]' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          {isConnecting ? (
            <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <div className={`p-4 rounded-2xl mb-3 ${isActive ? 'bg-white/10' : 'bg-slate-700'}`}>
                <svg className={`w-8 h-8 ${isActive ? 'text-white' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {isActive ? 'Live' : 'Start Talk'}
              </span>
            </>
          )}
        </button>

        {/* Improved Visualizer */}
        <div className="absolute -bottom-24 w-64 flex items-center justify-center gap-1.5 h-12">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-indigo-500 rounded-full transition-all duration-75"
              style={{
                height: isActive ? `${Math.max(4, volume * (30 + Math.random() * 80))}px` : '4px',
                opacity: isActive ? 0.8 : 0.2
              }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-16 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        {isActive ? 'Listening...' : 'Ready to connect'}
      </div>
    </div>
  );
};

export default VoiceMode;
