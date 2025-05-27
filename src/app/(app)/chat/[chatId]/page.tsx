import { ChatWindow } from '@/components/chat/chat-window';
import type { ChatParticipant } from '@/types';
import { currentUser } from '@clerk/nextjs/server';

// This is a server component, so we can fetch data here or pass it down.
// For a real app, you'd fetch chat details and messages based on params.chatId.

// Mock function to get chat participants (replace with actual data fetching)
async function getChatParticipants(chatId: string, currentClerkId: string | undefined): Promise<ChatParticipant[]> {
  // Simulate fetching participants
  if (chatId === '1') { // Alice Wonderland
    return [
      { id: 'user_alice_123', displayName: 'Alice Wonderland', photoURL: 'https://placehold.co/40x40.png' },
      { id: currentClerkId || 'current_user_mock_id', displayName: 'Me', photoURL: 'https://placehold.co/40x40.png' }
    ];
  }
  if (chatId === '2') { // Bob The Builder
     return [
      { id: 'user_bob_456', displayName: 'Bob The Builder', photoURL: 'https://placehold.co/40x40.png' },
      { id: currentClerkId || 'current_user_mock_id', displayName: 'Me', photoURL: 'https://placehold.co/40x40.png' }
    ];
  }
   if (chatId === '3') { // Charlie Chaplin
     return [
      { id: 'user_charlie_789', displayName: 'Charlie Chaplin', photoURL: 'https://placehold.co/40x40.png' },
      { id: currentClerkId || 'current_user_mock_id', displayName: 'Me', photoURL: 'https://placehold.co/40x40.png' }
    ];
  }
    if (chatId === '4') { // Diana Prince
     return [
      { id: 'user_diana_101', displayName: 'Diana Prince', photoURL: 'https://placehold.co/40x40.png' },
      { id: currentClerkId || 'current_user_mock_id', displayName: 'Me', photoURL: 'https://placehold.co/40x40.png' }
    ];
  }
  // Default / fallback
  return [{ id: 'unknown_user_id', displayName: 'Unknown User', photoURL: 'https://placehold.co/40x40.png' }];
}


export default async function IndividualChatPage({ params }: { params: { chatId: string } }) {
  const user = await currentUser();
  // In a real app, fetch chat data using params.chatId
  // For now, we'll pass it to ChatWindow which might use mock data or its own fetching
  const participants = await getChatParticipants(params.chatId, user?.id);
  const chatName = participants.find(p => p.id !== user?.id)?.displayName || `Chat ${params.chatId}`;


  return (
    <div className="h-full flex flex-col">
      <ChatWindow 
        chatId={params.chatId} 
        chatParticipants={participants}
        chatName={chatName}
        // initialMessages could be fetched here and passed down
      />
    </div>
  );
}
