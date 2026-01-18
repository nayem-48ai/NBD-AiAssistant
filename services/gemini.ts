
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ChatModelMode } from "../types";

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  // Using gemini-3-flash-preview for speed and search accuracy
  const modelName = 'gemini-3-flash-preview';
  
  const systemInstruction = `You are NBD AI Assistant, a world-class AI created by Net BD Pro. 
  CURRENT CONTEXT: If asked about the current time or date in Bangladesh or anywhere, ALWAYS use the googleSearch tool to get real-time results. 
  Today's actual date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
  Current server time: ${new Date().toLocaleTimeString('en-US')}.
  
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
