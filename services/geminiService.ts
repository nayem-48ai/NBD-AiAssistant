
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";

// অত্যন্ত নিরাপদ উপায়ে API Key বের করার ফাংশন
const getSafeApiKey = (): string => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Environment check failed, using fallback empty key.");
  }
  return "";
};

const getAI = () => {
  const apiKey = getSafeApiKey();
  if (!apiKey) {
    throw new Error("API Key is not configured correctly.");
  }
  return new GoogleGenAI({ apiKey });
};

// আপডেট করা সিস্টেম ইন্সট্রাকশন: মারকডাউন (যেমন ** বা __) ব্যবহার করা সম্পূর্ণ নিষিদ্ধ।
const SYSTEM_INSTRUCTION = `You are NBD AI Assistant, a premium AI created by Net BD Pro. 
Strict Rule: DO NOT use markdown formatting like asterisks (**) or underscores (__) for bolding or emphasis. 
Output responses in clean, plain text only. 
Your name is NBD AI Assistant. Your creator is Net BD Pro. 
Respond naturally in the language user speaks (Bengali or English).`;

/**
 * Tool definition for image generation function calling used by the model
 */
const generateImageTool: FunctionDeclaration = {
  name: 'generate_image',
  parameters: {
    type: Type.OBJECT,
    description: 'Generate or create an image based on a prompt.',
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'The description of the image to generate.',
      },
      aspect_ratio: {
        type: Type.STRING,
        description: 'The aspect ratio of the image (e.g., "1:1", "16:9", "9:16").',
      },
    },
    required: ['prompt'],
  },
};

export const chatWithGeminiStream = async (
  message: string,
  history: any[],
  config: { useSearch?: boolean; useThinking?: boolean; useFast?: boolean; image?: string; }
) => {
  const ai = getAI();
  const { useSearch, useThinking, useFast, image } = config;

  let modelName = useThinking ? 'gemini-3-pro-preview' : (useFast ? 'gemini-flash-lite-latest' : 'gemini-3-flash-preview');
  if (image) modelName = 'gemini-3-pro-preview';

  const parts: any[] = [{ text: message }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.split(',')[1],
        mimeType: image.split(';')[0].split(':')[1]
      }
    });
  }

  const tools: any[] = [];
  if (useSearch) tools.push({ googleSearch: {} });
  tools.push({ functionDeclarations: [generateImageTool] });

  return await ai.models.generateContentStream({
    model: modelName,
    contents: [...history, { role: 'user', parts }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      tools: tools.length > 0 ? tools : undefined,
      thinkingConfig: useThinking ? { thinkingBudget: 32768 } : undefined
    },
  });
};

export const processImage = async (prompt: string, aspectRatio: string = "1:1", baseImage?: string) => {
  const ai = getAI();
  const parts: any[] = [{ text: prompt }];

  if (baseImage) {
    parts.unshift({
      inlineData: {
        data: baseImage.split(',')[1],
        mimeType: baseImage.split(';')[0].split(':')[1] || 'image/png'
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
      },
    },
  });

  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("No image data returned from Gemini.");
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
