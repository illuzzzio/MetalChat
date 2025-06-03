
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'other' | 'metalAI';
  timestamp: string; 
  type: 'text' | 'image' | 'audio' | 'video';
  fileUrl?: string;
  fileName?: string;
  isLoading?: boolean;
  duration?: number;
  isDeleted?: boolean; // For "delete for everyone"
  deletedForMe?: boolean; // Client-side only for "delete for me"
  userId?: string; // ID of the user who sent the message
}

export interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  isGroup?: boolean; // To differentiate between direct chats and groups in the future
  createdBy?: string; // User ID of the creator
}

export interface Idea {
  id: string;
  prompt: string;
  imageDataUri: string;
  timestamp: string;
}

// For onboarding and settings
export interface UserProfile {
  displayName: string;
  photoURL?: string; // Placeholder for now
}
