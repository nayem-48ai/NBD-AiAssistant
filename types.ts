
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE'
}

export enum ChatModelMode {
  FAST = 'FAST',
  THINKING = 'THINKING',
  SEARCH = 'SEARCH'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: string;
  groundingLinks?: Array<{ title: string; uri: string }>;
  isNew?: boolean; // শুধুমাত্র নতুন মেসেজে এনিমেশন দেখানোর জন্য
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}
