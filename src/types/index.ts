import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  clerkId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  bio?: string;
}

export interface ChatParticipant {
  id: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface Chat {
  id: string;
  participants: string[]; // array of user IDs
  participantDetails: ChatParticipant[]; // denormalized for easier display
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
  lastMessageSenderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // unreadCounts?: { [userId: string]: number }; // Optional
}

export type MessageMediaType = 'image' | 'video' | 'audio' | 'file';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderPhotoURL?: string | null; // Denormalized for display
  senderDisplayName?: string | null; // Denormalized for display
  text?: string;
  mediaUrl?: string;
  mediaType?: MessageMediaType;
  fileName?: string; // For file media type
  timestamp: Timestamp;
  deleted?: boolean; // Soft delete
  reactions?: { [emoji: string]: string[] }; // emoji: [userIds]
}
