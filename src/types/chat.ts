export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other' | 'metalAI'; // Added 'metalAI'
  timestamp: string; // Should be Firestore Timestamp in practice, but string for simplicity here before conversion
  type: 'text' | 'image' | 'audio' | 'video';
  fileUrl?: string;
  fileName?: string;
  isLoading?: boolean; // For AI responses or file uploads
}

export interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  lastMessage: string;
  timestamp: string; // Should be Firestore Timestamp
  messages: Message[];
}