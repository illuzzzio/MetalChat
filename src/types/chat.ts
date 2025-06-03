
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'metalAI'; // 'other' is removed as userId distinguishes users
  timestamp: string; 
  type: 'text' | 'image' | 'audio' | 'video';
  fileUrl?: string | null; // Allow null for Firestore
  fileName?: string | null; // Allow null for Firestore
  isLoading?: boolean;
  duration?: number | null; // Allow null for Firestore
  isDeleted?: boolean;
  deletedForUserIds?: string[]; // Array of user IDs for whom message is deleted
  userId?: string; // Clerk User ID of the sender
  userDisplayName?: string; // Display name of the sender at the time of message
  userAvatarUrl?: string; // Avatar URL of the sender at the time of message
}

export interface Conversation {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
  isGroup?: boolean;
  createdBy?: string; // Clerk User ID of the creator
  createdByName?: string; // Display name of creator
  isSelfChat?: boolean; // True if this is a "You" chat
  // members?: string[]; // Array of Clerk User IDs (for future group management)
}

export interface Idea {
  id: string;
  prompt: string;
  imageDataUri: string;
  timestamp: string;
}

// For app-specific profile data stored potentially in localStorage
export interface UserProfile {
  clerkUserId: string; // Link to Clerk user
  displayName: string;
  photoURL?: string; // Local preview or override
}
