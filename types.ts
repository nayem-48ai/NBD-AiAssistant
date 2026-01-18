
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: string;
  groundingLinks?: GroundingLink[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
  config: {
    useSearch: boolean;
    useThinking: boolean;
    useFast: boolean;
  };
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}
