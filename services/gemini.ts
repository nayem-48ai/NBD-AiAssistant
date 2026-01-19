
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatModelMode } from "../types";

let cachedRemoteKey: string | null = null;
const REMOTE_CONFIG_URL = "https://github.com/nayem-48ai/nayem-48ai/blob/main/.env.local";

/**
 * GitHub থেকে রিমোটলি এপিআই কি লোড করার ফাংশন
 */
export const fetchRemoteKey = async (): Promise<string | null> => {
  if (cachedRemoteKey) return cachedRemoteKey;
  try {
    const response = await fetch(REMOTE_CONFIG_URL);
    if (!response.ok) throw new Error("Failed to fetch remote config");
    const text = await response.text();
    
    // .env ফরম্যাট থেকে API_KEY এক্সট্র্যাক্ট করা (API_KEY=value)
    const match = text.match(/API_KEY\s*=\s*([^\s\n]+)/);
    if (match && match[1]) {
      cachedRemoteKey = match[1].trim();
      console.log("Remote API Key loaded successfully");
      return cachedRemoteKey;
    }
    return null;
  } catch (error) {
    console.error("Error loading remote key:", error);
    return null;
  }
};

export const getGeminiClient = () => {
  // ১. চেক করা ইউজার নিজের কি দিয়েছে কি না (LocalStorage)
  const customKey = localStorage.getItem('nbd_custom_api_key');
  
  // ২. ইউজার কি না দিলে রিমোট কি বা এনভায়রনমেন্ট কি ব্যবহার করা
  const apiKey = customKey || cachedRemoteKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please wait for remote config or provide one.");
  }
  
  return new GoogleGenAI({ apiKey });
};

export const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .trim();
};

export const chatWithGemini = async (
  message: string, 
  history: any[], 
  mode: ChatModelMode, 
  base64Image?: string
) => {
  const ai = getGeminiClient();
  const modelName = mode === ChatModelMode.THINKING ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const systemInstruction = `You are NBD AI Assistant, a world-class AI created by Net BD Pro. 
  Today's actual date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
  
  STYLE RULES:
  - Provide clean, professional responses.
  - DO NOT use any markdown symbols like asterisks (**), hashtags (#), or backticks.
  - REPLY in the same language the user uses (Bengali or English).
  - Be direct and helpful.`;

  const config: any = { 
    systemInstruction,
    temperature: mode === ChatModelMode.THINKING ? 0.7 : 0.4
  };

  if (mode === ChatModelMode.THINKING) {
    config.thinkingConfig = { thinkingBudget: 16000 };
  }

  if (mode === ChatModelMode.SEARCH) {
    config.tools = [{ googleSearch: {} }];
  }

  const contents: any[] = history.map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.content }]
  }));

  const userParts: any[] = [{ text: message }];
  if (base64Image) {
    userParts.push({
      inlineData: {
        data: base64Image.split(',')[1],
        mimeType: 'image/png'
      }
    });
  }
  
  contents.push({ role: 'user', parts: userParts });

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const links = groundingChunks
    .filter((c: any) => c.web)
    .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

  return {
    text: stripMarkdown(response.text || ""),
    links
  };
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export function encodeBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const generateImage = async (prompt: string, aspectRatio: string, base64Image?: string) => {
  const ai = getGeminiClient();
  const parts: any[] = [{ text: prompt }];
  if (base64Image) {
    parts.unshift({
      inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' }
    });
  }
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { imageConfig: { aspectRatio: aspectRatio as any } }
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("No image generated");
};
