
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatModelMode } from "../types";

const CORE_ENC_KEY_1 = "QUl6YVN5RHBGMXI1cXRnNmRYMGpQQ3NIRFVjQlZvVEktemIwaUow";
const CORE_ENC_KEY_2 = "QUl6YVN5Q21GdHJlRVBZV1kwN09SM0ZrcW1PUG5MSzJ4c0tnZUFZ"; 

export const getActiveApiKey = () => {
  const selectedEngine = localStorage.getItem('nbd_api_engine') || 'API 1';
  if (selectedEngine === 'CUSTOM') {
    const customKey = localStorage.getItem('nbd_custom_api_key');
    if (customKey && customKey.trim().length > 10) return customKey.trim();
  }
  if (process.env.API_KEY) return process.env.API_KEY;
  try {
    return atob(selectedEngine === 'API 2' ? CORE_ENC_KEY_2 : CORE_ENC_KEY_1);
  } catch (e) {
    return atob(CORE_ENC_KEY_1);
  }
};

export const getGeminiClient = () => {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error("API Key is missing.");
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
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `You are NBD AI Assistant, a world-class, advanced AI created by Net BD Pro. 
  STYLE RULES:
  - DO NOT use markdown symbols, However, if the user uses emoji, then you can use emoji accordingly if you want, there is no obligation.
  - DETECT user language and reply in the same language, However, if the user requests it, you can use the language of their choice, this is also not mandatory.
  - Be direct and professional.`;

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
    config: { systemInstruction, temperature: 0.6 }
  });

  return {
    text: stripMarkdown(response.text || ""),
    links: []
  };
};

export const generateImage = async (prompt: string, aspectRatio: string, referenceImage?: string) => {
  const ai = getGeminiClient();
  const parts: any[] = [{ text: prompt }];
  
  if (referenceImage) {
    parts.push({
      inlineData: { 
        data: referenceImage.split(',')[1], 
        mimeType: 'image/png' 
      }
    });
  }
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { 
      imageConfig: { 
        aspectRatio: aspectRatio as any 
      } 
    }
  });

  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Generation failed.");
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
