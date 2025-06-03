
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other';
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video';
  fileUrl?: string;
  fileName?: string;
}

export interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}
