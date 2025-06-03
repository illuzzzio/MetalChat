
export interface ParticipantDetails {
  displayName: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'metalAI'; 
  timestamp: string; 
  type: 'text' | 'image' | 'audio' | 'video';
  fileUrl?: string | null; 
  fileName?: string | null; 
  isLoading?: boolean;
  duration?: number | null; 
  isDeleted?: boolean;
  deletedForUserIds?: string[]; 
  userId?: string; // Clerk User ID of the sender
  userDisplayName?: string; 
  userAvatarUrl?: string; 
}

export interface Conversation {
  id: string;
  name: string; // For group chats, or a generic name for 1-on-1 like "Chat with X"
  avatarUrl: string; // For group chats, or the other user's avatar for 1-on-1
  dataAiHint?: string;
  lastMessage: string;
  timestamp: string; // ISO string
  messages: Message[];
  isGroup?: boolean; // true for group, false for 1-on-1
  createdBy?: string; // Clerk User ID of the creator
  createdByName?: string; 
  isSelfChat?: boolean; // True if this is a "You" chat
  members?: string[]; // Array of Clerk User IDs (for 1-on-1 and group chats)
  participantDetails?: { [userId: string]: ParticipantDetails }; // Stores { userId: { displayName, avatarUrl } }
}

export interface Idea {
  id: string;
  prompt: string;
  imageDataUri: string;
  timestamp: string;
}

export interface UserProfile {
  clerkUserId: string; 
  displayName: string;
  photoURL?: string; 
  hiddenConversationIds?: string[]; // Added to store IDs of hidden conversations
}

// For API responses from user search
export interface SearchedUser {
  id: string;
  username: string | null;
  primaryEmailAddress: string | undefined;
  imageUrl: string;
}

