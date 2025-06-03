
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import IdeaList from "@/components/idea-storage/idea-list";
import type { Conversation, Message, Idea, UserProfile, SearchedUser, ParticipantDetails } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, where, writeBatch, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useAuth } from '@clerk/nextjs';
// FindUsersDialog is removed
import CreateGroupDialog from '@/components/create-group-dialog';
import ManageGroupMembersDialog from '@/components/manage-group-members-dialog';


const LOCAL_STORAGE_PROFILE_KEY_PREFIX = "metalChatUserProfile_";
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX = "metalChatOnboardingComplete_";
const SELF_CHAT_ID_PREFIX = "self-"; 
const SHARED_CONVERSATION_ID = "global-metalai-chat";
const initialGlobalConversation: Conversation = {
  id: SHARED_CONVERSATION_ID,
  name: "Global MetalAI Chat",
  avatarUrl: "https://placehold.co/100x100.png?text=GC",
  dataAiHint: "group chat",
  lastMessage: "Welcome to the global chat! MetalAI will respond to your messages.",
  timestamp: new Date(0).toISOString(), 
  messages: [],
  isGroup: true,
  members: ["everyone"], 
};


export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([initialGlobalConversation]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [storedIdeas, setStoredIdeas] = useState<Idea[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [appUserProfile, setAppUserProfile] = useState<UserProfile | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [allOtherUsers, setAllOtherUsers] = useState<SearchedUser[]>([]); // New state for all discoverable users
  // isFindUsersDialogOpen is removed
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isManageMembersDialogOpen, setIsManageMembersDialogOpen] = useState(false);
  const [conversationToManage, setConversationToManage] = useState<Conversation | null>(null);


  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const { userId: clerkUserId } = useAuth();


  useEffect(() => {
    setHasMounted(true);
    const initAudio = async () => { await initTone(); };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  // Onboarding and App-Specific Profile loading
  useEffect(() => {
    if (!hasMounted || !isClerkLoaded || !clerkUserId) return;

    if (!isSignedIn) return; 
    
    const onboardingComplete = localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${clerkUserId}`);
    if (onboardingComplete !== 'true') {
      router.push('/onboarding');
    } else {
      const storedAppProfileString = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`);
      if (storedAppProfileString) {
        try {
          const parsedProfile: UserProfile = JSON.parse(storedAppProfileString);
          if (!parsedProfile.hiddenConversationIds) {
            parsedProfile.hiddenConversationIds = [];
          }
          setAppUserProfile(parsedProfile);
        } catch (e) { 
            console.error("Failed to parse app profile", e); 
            const fallbackProfile: UserProfile = {
                clerkUserId: clerkUserId,
                displayName: user?.fullName || user?.username || "User",
                photoURL: user?.imageUrl || undefined,
                hiddenConversationIds: []
            };
            setAppUserProfile(fallbackProfile);
            localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`, JSON.stringify(fallbackProfile));
        }
      } else { 
        const initialProfile: UserProfile = {
            clerkUserId: clerkUserId,
            displayName: user?.fullName || user?.username || "User",
            photoURL: user?.imageUrl || undefined,
            hiddenConversationIds: []
        };
        setAppUserProfile(initialProfile);
        localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`, JSON.stringify(initialProfile));
      }
    }
  }, [router, hasMounted, isSignedIn, isClerkLoaded, clerkUserId, user]);

  // Fetch ALL users for discovery
  useEffect(() => {
    if (!hasMounted || !clerkUserId || !appUserProfile) return;

    const fetchAllUsers = async () => {
      try {
        const response = await fetch('/api/users/search'); // No query, should fetch all/default list
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch users: ${response.statusText}`);
        }
        const data = await response.json();
        if (data && Array.isArray(data.users)) {
          setAllOtherUsers(data.users.filter((u: SearchedUser) => u.id !== clerkUserId));
        } else {
          setAllOtherUsers([]);
          console.warn("Fetched users, but response.users was not an array:", data);
        }
      } catch (error) {
        console.error("Error fetching all users:", error);
        toast({ title: "Error Fetching Users", description: (error as Error).message, variant: "destructive" });
        setAllOtherUsers([]);
      }
    };
    fetchAllUsers();
  }, [hasMounted, clerkUserId, appUserProfile, toast]);


  // Fetch conversations from Firestore
  useEffect(() => {
    if (!hasMounted || !clerkUserId || !user || !appUserProfile) return; 

    const conversationsRef = collection(db, "conversations");
    const userConversationsQuery = query(
      conversationsRef,
      where("members", "array-contains", clerkUserId),
      orderBy("timestamp", "desc")
    );

    const unsubscribeUserConvos = onSnapshot(userConversationsQuery, (querySnapshot) => {
      const fetchedUserConversations: Conversation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Client-side filtering for hidden conversations is handled by `displayedConversations` memo
        fetchedUserConversations.push({
            id: docSnap.id,
            name: data.name || "Unnamed Chat",
            avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name?.[0]?.toUpperCase() || 'C'}`,
            dataAiHint: data.dataAiHint || (data.isGroup ? "group chat" : "person chat"),
            lastMessage: data.lastMessage || "No messages yet.",
            timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            messages: [], 
            isGroup: data.isGroup !== undefined ? data.isGroup : true,
            isSelfChat: data.isSelfChat || false,
            createdBy: data.createdBy,
            members: data.members || [],
            participantDetails: data.participantDetails || {},
        });
      });
      
      setConversations(prevConvos => {
        const globalChat = initialGlobalConversation; 
        const combined = [...fetchedUserConversations, globalChat]
          .filter((convo, index, self) => index === self.findIndex((c) => c.id === convo.id))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (!selectedConversationId && combined.length > 0) {
          const selfChat = combined.find(c => c.isSelfChat && !appUserProfile.hiddenConversationIds?.includes(c.id));
          const firstUserChat = combined.find(c => c.id !== SHARED_CONVERSATION_ID && !c.isSelfChat && !appUserProfile.hiddenConversationIds?.includes(c.id));
          const firstVisible = combined.find(c => !appUserProfile.hiddenConversationIds?.includes(c.id));
          setSelectedConversationId(selfChat?.id || firstUserChat?.id || firstVisible?.id || null);
        } else if (selectedConversationId && !combined.find(c => c.id === selectedConversationId && !appUserProfile.hiddenConversationIds?.includes(c.id))) {
           const selfChat = combined.find(c => c.isSelfChat && !appUserProfile.hiddenConversationIds?.includes(c.id));
          const firstUserChat = combined.find(c => c.id !== SHARED_CONVERSATION_ID && !c.isSelfChat && !appUserProfile.hiddenConversationIds?.includes(c.id));
           const firstVisible = combined.find(c => !appUserProfile.hiddenConversationIds?.includes(c.id));
          setSelectedConversationId(selfChat?.id || firstUserChat?.id || firstVisible?.id || null);
        }
        return combined;
      });

    }, (error) => {
      console.error("Error fetching user conversations (onSnapshot):", error);
      toast({ 
        title: "Firestore Connection Error", 
        description: `Could not fetch your conversations: ${error.message}. You may be offline or Firebase configuration is incorrect.`, 
        variant: "destructive",
        duration: 7000
      });
    });
    
    const selfChatId = `${SELF_CHAT_ID_PREFIX}${clerkUserId}`;
    const selfChatDocRef = doc(db, "conversations", selfChatId);
    getDoc(selfChatDocRef).then(docSnap => {
      if (!docSnap.exists()) {
        const selfUserDisplayName = appUserProfile?.displayName || user.fullName || user.username || "You";
        const selfUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl;
        const selfParticipantDetails: ParticipantDetails = {
            displayName: selfUserDisplayName,
            avatarUrl: selfUserAvatarUrl || undefined
        };
        const newSelfChatData = {
          name: "You", 
          avatarUrl: selfUserAvatarUrl || `https://placehold.co/100x100.png?text=Y`,
          dataAiHint: "self note user",
          lastMessage: "Notes to self...",
          timestamp: serverTimestamp(),
          isGroup: false,
          isSelfChat: true,
          createdBy: clerkUserId,
          members: [clerkUserId],
          participantDetails: { [clerkUserId]: selfParticipantDetails },
        };
        setDoc(selfChatDocRef, newSelfChatData).catch(err => {
            console.error("Error creating self chat:", err);
            toast({title: "Error", description: `Could not create self-chat: ${err.message}`, variant: "destructive"})
        });
      } else {
        const existingData = docSnap.data();
        const selfUserDisplayName = appUserProfile?.displayName || user.fullName || user.username || "You";
        const selfUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl;
        const defaultAvatarPlaceholder = `https://placehold.co/100x100.png?text=Y`;
        
        const currentSelfDetails = existingData.participantDetails?.[clerkUserId];
        const currentAvatar = existingData.avatarUrl;

        if (currentSelfDetails?.displayName !== selfUserDisplayName ||
            currentSelfDetails?.avatarUrl !== (selfUserAvatarUrl || undefined) ||
            currentAvatar !== (selfUserAvatarUrl || defaultAvatarPlaceholder) ) {
             updateDoc(selfChatDocRef, {
                participantDetails: { [clerkUserId]: { displayName: selfUserDisplayName, avatarUrl: selfUserAvatarUrl || undefined } },
                avatarUrl: selfUserAvatarUrl || defaultAvatarPlaceholder
             }).catch(err => console.error("Error updating self chat details:", err));
        }
      }
    }).catch(error => {
        console.error("Error fetching self-chat document:", error);
        toast({title: "Firestore Error", description: `Failed to get self-chat: ${error.message}`, variant: "destructive"})
    });

    return () => unsubscribeUserConvos();
  }, [hasMounted, clerkUserId, toast, user, appUserProfile]);


  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId || !clerkUserId || selectedConversationId === SHARED_CONVERSATION_ID) {
        setConversations(prevConvos => prevConvos.map(c => 
            c.id === selectedConversationId ? { ...c, messages: c.id === SHARED_CONVERSATION_ID ? c.messages : [] } : c
        ));
        if (selectedConversationId === SHARED_CONVERSATION_ID && initialGlobalConversation.messages.length === 0) {
            setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
                ...c, messages: [
                    { id: 'global-welcome-1', text: 'Welcome to the global chat!', sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', userId: 'metalAI-bot', userDisplayName: 'MetalAI' },
                    { id: 'global-welcome-2', text: 'Feel free to discuss anything. MetalAI will respond if mentioned or in general context.', sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', userId: 'metalAI-bot', userDisplayName: 'MetalAI' }
                ]
            } : c));
        }
        return;
    }

    const messagesRef = collection(db, "conversations", selectedConversationId, "messages");
    const qMessages = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({
          id: docSnap.id,
          text: data.text,
          sender: data.sender,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          duration: data.duration,
          isDeleted: data.isDeleted || false,
          deletedForUserIds: data.deletedForUserIds || [], 
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          userAvatarUrl: data.userAvatarUrl,
        });
      });

      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === selectedConversationId
            ? { 
                ...convo, 
                messages: fetchedMessages, 
                lastMessage: fetchedMessages.length > 0 ? (fetchedMessages[fetchedMessages.length -1]?.text || "Media shared") : convo.lastMessage, 
                timestamp: fetchedMessages.length > 0 ? (fetchedMessages[fetchedMessages.length -1]?.timestamp || convo.timestamp) : convo.timestamp 
              }
            : convo
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    }, (error) => {
      console.error(`Error fetching messages for ${selectedConversationId} (onSnapshot):`, error);
      toast({ 
        title: "Firestore Connection Error", 
        description: `Could not fetch messages: ${error.message}. You may be offline or Firebase configuration is incorrect.`, 
        variant: "destructive",
        duration: 7000
      });
    });

    return () => unsubscribeMessages();
  }, [selectedConversationId, toast, clerkUserId]);

  const unhideConversation = useCallback((conversationId: string) => {
    if (appUserProfile && appUserProfile.hiddenConversationIds?.includes(conversationId)) {
      const updatedProfile = {
        ...appUserProfile,
        hiddenConversationIds: appUserProfile.hiddenConversationIds.filter(id => id !== conversationId),
      };
      setAppUserProfile(updatedProfile);
      if (clerkUserId) {
        localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`, JSON.stringify(updatedProfile));
      }
    }
  }, [appUserProfile, clerkUserId]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    unhideConversation(id); 
  };

  const handleAddIdea = (idea: Idea) => {
    setStoredIdeas(prevIdeas => [idea, ...prevIdeas].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };
  
  const handleDeleteIdea = (ideaId: string) => {
    setStoredIdeas(prevIdeas => prevIdeas.filter(idea => idea.id !== ideaId));
    toast({ title: "Idea Deleted", description: "The idea has been removed from your storage." });
  };

  const handleSendMessage = useCallback(async (
    conversationId: string, 
    text: string, 
    type: Message['type'] = 'text', 
    file?: File, 
    imageDataUri?: string,
    duration?: number
  ) => {
    if (!conversationId || !clerkUserId || !user) {
        toast({ title: "Error", description: "Cannot send message. User not identified.", variant: "destructive" });
        return;
    }

    const currentAppDisplayName = appUserProfile?.displayName || user.fullName || user.username || "User";
    const currentUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl || undefined; 

    if (conversationId === SHARED_CONVERSATION_ID) {
        const newMessage: Message = {
            id: uuidv4(),
            text: text,
            sender: 'user',
            type: type,
            timestamp: new Date().toISOString(),
            userId: clerkUserId,
            userDisplayName: currentAppDisplayName,
            userAvatarUrl: currentUserAvatarUrl,
        };
        if (imageDataUri && type==='image') newMessage.fileUrl = imageDataUri;

        setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
            ...c,
            messages: [...c.messages, newMessage],
            lastMessage: text || "Shared media",
            timestamp: new Date().toISOString(),
        }:c).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

        setTimeout(async () => {
             try {
                const chatHistoryForAI = conversations.find(c=>c.id === SHARED_CONVERSATION_ID)?.messages
                    .filter(msg => (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text')
                    .slice(-5) 
                    .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
                    parts: [{ text: msg.text as string }]
                    })) || [];

                const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
                const aiMessage: Message = {
                    id: uuidv4(),
                    text: aiResponse.aiResponse,
                    sender: 'metalAI',
                    type: 'text',
                    timestamp: new Date().toISOString(),
                    userId: 'metalAI-bot',
                    userDisplayName: 'MetalAI',
                    userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',
                };
                 setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
                    ...c,
                    messages: [...c.messages, aiMessage],
                    lastMessage: aiResponse.aiResponse,
                    timestamp: new Date().toISOString(),
                }:c).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

            } catch (aiError) {
                console.error("Global MetalAI chat error:", aiError);
            }
        }, 1000);
        return;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const conversationRef = doc(db, "conversations", conversationId);
    
    const messageData: Partial<Message> & { timestamp: any } = {
        sender: 'user',
        type,
        timestamp: serverTimestamp(),
        userId: clerkUserId,
        userDisplayName: currentAppDisplayName,
        userAvatarUrl: currentUserAvatarUrl,
        isDeleted: false,
        deletedForUserIds: [], 
    };
    
    let displayLastMessage = text;

    if (type === 'text') {
      messageData.text = text;
    } else if (imageDataUri && type === 'image') {
        messageData.fileUrl = imageDataUri; 
        messageData.fileName = `Pasted Image ${new Date().toISOString()}.png`;
        messageData.text = ""; 
        displayLastMessage = `${currentAppDisplayName} shared an image`;
    } else if (file) {
      const localUrl = URL.createObjectURL(file); 
      messageData.fileUrl = localUrl; 
      messageData.fileName = file.name;
      messageData.text = ""; 
      if (type === 'audio') { displayLastMessage = `${currentAppDisplayName} sent an audio message`; if (duration) messageData.duration = duration; }
      else if (type === 'video') { displayLastMessage = `${currentAppDisplayName} shared a video`; }
      else if (type === 'image') { displayLastMessage = `${currentAppDisplayName} shared an image`; }
       toast({ title: `Local ${type} Preview`, description: `"${file.name}" is shown locally. File upload needed for sharing.`, duration: 7000 });
    } else if (type !== 'text') {
      toast({ title: "Send Error", description: "Cannot send empty media message.", variant: "destructive"});
      return;
    }
    
    if (!messageData.text && !messageData.fileUrl && type !== 'text') { 
        messageData.text = 'Media Content'; displayLastMessage = `${currentAppDisplayName} shared media`;
    }
    if (type === 'text' && !messageData.text) return;

    try {
      const finalMessageData = { ...messageData };
      if (!finalMessageData.text) finalMessageData.text = "";
      if (!finalMessageData.fileUrl) finalMessageData.fileUrl = null; 
      if (!finalMessageData.fileName) finalMessageData.fileName = null;
      if (!finalMessageData.duration) finalMessageData.duration = null;

      await addDoc(messagesRef, finalMessageData);
      await updateDoc(conversationRef, { lastMessage: displayLastMessage, timestamp: serverTimestamp() });
      unhideConversation(conversationId); 
      
      const currentConvo = conversations.find(c => c.id === conversationId);
      if (type === 'text' && finalMessageData.sender === 'user' && currentConvo && !currentConvo.isSelfChat && currentConvo.isGroup) { 
        const loadingAiMessageId = `metalai-loading-${Date.now()}`;
         setConversations(prevConvos =>
            prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: [...convo.messages, { id: loadingAiMessageId, text: "MetalAI is thinking...", sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', isLoading: true, userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground'}] } : convo)
          );
        try {
          const chatHistoryForAI = currentConvo?.messages
            .filter(msg => !msg.isLoading && (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text' && !msg.isDeleted && !msg.deletedForUserIds?.includes(clerkUserId))
            .slice(-10) 
            .map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model', parts: [{ text: msg.text as string }] })) || [];
          const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
          setConversations(prevConvos => prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId) } : convo ));
          await addDoc(messagesRef, { text: aiResponse.aiResponse, sender: 'metalAI', type: 'text', timestamp: serverTimestamp(), userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground', isDeleted: false, deletedForUserIds: [] });
          await updateDoc(conversationRef, { lastMessage: aiResponse.aiResponse, timestamp: serverTimestamp() });
        } catch (aiError) {
          console.error("MetalAI chat error:", aiError);
          toast({ title: "MetalAI Error", description: "MetalAI could not respond.", variant: "destructive" });
          setConversations(prevConvos => prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId) } : convo ));
          await addDoc(messagesRef, { text: "Sorry, I encountered an error.", sender: 'metalAI', type: 'text', timestamp: serverTimestamp(), userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',isDeleted: false, deletedForUserIds: [] });
          await updateDoc(conversationRef, { lastMessage: "Sorry, I encountered an error.", timestamp: serverTimestamp() });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const err = error as Error;
      toast({ title: "Send Error", description: `Could not send message. ${err.message}. Check Firebase config.`, variant: "destructive", duration: 7000 });
    }
  }, [toast, conversations, clerkUserId, user, appUserProfile, unhideConversation]); 

  const handleDeleteMessageForMe = async (conversationId: string, messageId: string) => {
    if (!clerkUserId || conversationId === SHARED_CONVERSATION_ID) return; 
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    try {
        const messageDoc = await getDoc(messageRef);
        if (!messageDoc.exists()) return;

        const messageData = messageDoc.data();
        const updatedDeletedForUserIds = Array.isArray(messageData.deletedForUserIds) 
        ? [...messageData.deletedForUserIds, clerkUserId] 
        : [clerkUserId];
        
        await updateDoc(messageRef, { deletedForUserIds: updatedDeletedForUserIds });
        toast({ title: "Message Hidden", description: "The message is hidden in your view."});
    } catch (error) {
        console.error("Error deleting message for me:", error);
        const err = error as Error;
        toast({ title: "Error Hiding Message", description: err.message, variant: "destructive"});
    }
  };

  const handleDeleteMessageForEveryone = async (conversationId: string, messageId: string) => {
    if (!conversationId || !messageId || !clerkUserId || conversationId === SHARED_CONVERSATION_ID) return;
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    
    try {
      const messageSnap = await getDoc(messageRef);
      if (!messageSnap.exists() || messageSnap.data()?.userId !== clerkUserId) {
          toast({ title: "Deletion Failed", description: "You can only delete your own messages.", variant: "destructive" });
          return;
      }
      await updateDoc(messageRef, { text: "This message was deleted.", type: "text", fileUrl: null, fileName: null, duration: null, isDeleted: true });
      toast({ title: "Message Deleted", description: "The message has been deleted for everyone."});
      
       const currentConvo = conversations.find(c => c.id === conversationId);
       if (currentConvo) {
         const visibleMessages = currentConvo.messages.filter(m => m.id !== messageId && !m.isDeleted && !m.deletedForUserIds?.includes(clerkUserId || ''));
         const newLastMessageText = visibleMessages.length > 0 ? (visibleMessages[visibleMessages.length - 1].text || "Media Content") : "No messages yet.";
         await updateDoc(doc(db, "conversations", conversationId), { lastMessage: newLastMessageText, timestamp: serverTimestamp() });
       }
    } catch (error) {
      console.error("Error deleting message for everyone:", error);
      const err = error as Error;
      toast({ title: "Deletion Error", description: err.message, variant: "destructive" });
    }
  };
  
  const handleCreateNewGroupConversation = async (groupName: string, selectedMembers: Array<{ id: string; displayName: string; avatarUrl?: string }>) => {
    if (!groupName.trim() || !clerkUserId || !user || !appUserProfile) {
      toast({ title: "Error", description: "Group name cannot be empty or user not identified.", variant: "destructive" });
      return;
    }
    if (selectedMembers.length === 0) {
        toast({ title: "Error", description: "Please select at least one member for the group.", variant: "destructive" });
        return;
    }

    const newConversationId = uuidv4();
    const newConversationRef = doc(db, "conversations", newConversationId);
    
    const creatorAppDisplayName = appUserProfile.displayName;
    const creatorAppAvatarUrl = appUserProfile.photoURL;
    
    const allMemberIds = [clerkUserId, ...selectedMembers.map(m => m.id)];
    const participantDetailsMap: { [userId: string]: ParticipantDetails } = {};

    participantDetailsMap[clerkUserId] = { 
        displayName: creatorAppDisplayName, 
        avatarUrl: creatorAppAvatarUrl || undefined 
    };

    selectedMembers.forEach(member => {
        participantDetailsMap[member.id] = {
            displayName: member.displayName,
            avatarUrl: member.avatarUrl || undefined
        };
    });

    const newConversationData = {
      id: newConversationId,
      name: groupName,
      avatarUrl: `https://placehold.co/100x100.png?text=${groupName.substring(0,1).toUpperCase()}`,
      dataAiHint: "group team users",
      lastMessage: `${creatorAppDisplayName} created the group.`,
      timestamp: serverTimestamp(),
      isGroup: true, 
      isSelfChat: false,
      createdBy: clerkUserId,
      members: allMemberIds,
      participantDetails: participantDetailsMap,
    };

    try {
      await setDoc(newConversationRef, newConversationData);
      unhideConversation(newConversationId); 
      setSelectedConversationId(newConversationId);
      toast({ title: "Group Created", description: `Group "${groupName}" is ready.` });
      setIsCreateGroupDialogOpen(false); 
    } catch (error) {
      console.error("Error creating group conversation:", error);
      const err = error as Error;
      toast({ title: "Creation Error", description: `Could not create group: ${err.message}`, variant: "destructive" });
    }
  };

  const handleStartChatWithUser = async (targetUser: SearchedUser) => {
    if (!clerkUserId || !user || !targetUser || !appUserProfile) {
      toast({ title: "Error", description: "Cannot start chat. User information missing.", variant: "destructive" });
      return;
    }

    const ids = [clerkUserId, targetUser.id].sort();
    const chatID = ids.join('_');
    const chatDocRef = doc(db, "conversations", chatID);

    try {
        const docSnap = await getDoc(chatDocRef);
        unhideConversation(chatID); 
        if (docSnap.exists()) {
            setSelectedConversationId(chatID);
            toast({ title: "Chat Opened", description: `Opened existing chat with ${targetUser.username || targetUser.primaryEmailAddress}.`});
        } else {
            const currentUserAppDisplayName = appUserProfile.displayName;
            const currentUserAppAvatarUrl = appUserProfile.photoURL;
            
            const currentUserDetails: ParticipantDetails = {
                displayName: currentUserAppDisplayName,
                avatarUrl: currentUserAppAvatarUrl || undefined,
            };
            const targetUserDetails: ParticipantDetails = {
                displayName: targetUser.username || targetUser.primaryEmailAddress || "User",
                avatarUrl: targetUser.imageUrl || undefined,
            };

            const newChatData = {
                id: chatID,
                name: `Chat with ${targetUserDetails.displayName}`, 
                avatarUrl: targetUserDetails.avatarUrl || `https://placehold.co/100x100.png?text=${targetUserDetails.displayName?.[0]?.toUpperCase() || 'U'}`, 
                dataAiHint: "person direct",
                lastMessage: "Chat started.",
                timestamp: serverTimestamp(),
                isGroup: false,
                isSelfChat: false,
                createdBy: clerkUserId,
                members: [clerkUserId, targetUser.id],
                participantDetails: {
                    [clerkUserId]: currentUserDetails,
                    [targetUser.id]: targetUserDetails,
                },
            };
            await setDoc(chatDocRef, newChatData);
            setSelectedConversationId(chatID);
            toast({ title: "Chat Started!", description: `You can now chat with ${targetUserDetails.displayName}.`});
        }
        // No dialog to close here anymore
    } catch (error) {
        console.error("Error starting 1-on-1 chat:", error);
        const err = error as Error;
        toast({ title: "Chat Error", description: `Could not start chat: ${err.message}. Check Firebase config.`, variant: "destructive", duration: 7000 });
    }
  };

  const handleHideConversation = (conversationId: string) => {
    if (!appUserProfile || !clerkUserId) return;
    const currentHiddenIds = appUserProfile.hiddenConversationIds || [];
    if (!currentHiddenIds.includes(conversationId)) {
        const updatedProfile = {
            ...appUserProfile,
            hiddenConversationIds: [...currentHiddenIds, conversationId],
        };
        setAppUserProfile(updatedProfile);
        localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`, JSON.stringify(updatedProfile));
        toast({title: "Chat Hidden", description: "The chat won't appear in your list until you interact with it again."});
        if (selectedConversationId === conversationId) {
            setSelectedConversationId(null); 
        }
    }
  };

  const handleOpenManageMembersDialog = (conversation: Conversation) => {
    if (conversation.isGroup) {
        setConversationToManage(conversation);
        setIsManageMembersDialogOpen(true);
    }
  };

  const handleAddMembersToGroup = async (conversationId: string, membersToAdd: Array<{ id: string; displayName: string; avatarUrl?: string }>) => {
    if (!clerkUserId || !user || !appUserProfile) return;
    const conversationRef = doc(db, "conversations", conversationId);
    
    const newMemberIds = membersToAdd.map(m => m.id);
    const newParticipantDetailsUpdates: { [key: string]: ParticipantDetails } = {};
    membersToAdd.forEach(member => {
        newParticipantDetailsUpdates[`participantDetails.${member.id}`] = {
            displayName: member.displayName,
            avatarUrl: member.avatarUrl || undefined,
        };
    });
    
    const adderName = appUserProfile.displayName;

    try {
        await updateDoc(conversationRef, {
            members: arrayUnion(...newMemberIds),
            ...newParticipantDetailsUpdates,
            lastMessage: `${adderName} added ${membersToAdd.length} new member(s).`,
            timestamp: serverTimestamp(),
        });
        toast({title: "Members Added", description: "Successfully added members to the group."});
    } catch (error) {
        console.error("Error adding members to group:", error);
        const err = error as Error;
        toast({title: "Error Adding Members", description: `Could not add members: ${err.message}`, variant: "destructive"});
        throw error; 
    }
  };

  const handleRemoveMemberFromGroup = async (conversationId: string, memberIdToRemove: string) => {
     if (!clerkUserId || !user || !appUserProfile) return;
    const conversationRef = doc(db, "conversations", conversationId);
    const conversationDoc = await getDoc(conversationRef);
    const currentConversationData = conversationDoc.data() as Conversation | undefined;

    if (!currentConversationData) {
        toast({title: "Error", description: "Group not found.", variant: "destructive"});
        return;
    }
    if (currentConversationData.members && currentConversationData.members.length <= 1) {
         toast({title: "Cannot Remove", description: "Group must have at least one member.", variant: "destructive"});
         throw new Error("Group must have at least one member.");
    }
     if (memberIdToRemove === currentConversationData.createdBy && currentConversationData.members && currentConversationData.members.length <=1 ) { 
         toast({title: "Cannot Remove", description: "The group creator cannot be removed if they are the last member.", variant: "destructive"});
         throw new Error("Creator cannot be removed if last member.");
     }

    const removerName = appUserProfile.displayName;
    const removedMemberName = currentConversationData.participantDetails?.[memberIdToRemove]?.displayName || 'A member';

    const updates: any = {
        members: arrayRemove(memberIdToRemove),
        [`participantDetails.${memberIdToRemove}`]: deleteField(),
        lastMessage: `${removerName} removed ${removedMemberName}.`,
        timestamp: serverTimestamp(),
    };

    try {
        await updateDoc(conversationRef, updates);
        toast({title: "Member Removed", description: `Successfully removed ${removedMemberName} from the group.`});
    } catch (error) {
        console.error("Error removing member from group:", error);
        const err = error as Error;
        toast({title: "Error Removing Member", description: `Could not remove member: ${err.message}`, variant: "destructive"});
        throw error; 
    }
  };


  if (!hasMounted || !isClerkLoaded) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Initializing MetalChat...</p></div>;
  }
  if (isClerkLoaded && !isSignedIn) {
    router.push('/sign-in');
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to sign-in...</p></div>;
  }
  if (isSignedIn && clerkUserId && localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${clerkUserId}`) !== 'true') {
     router.push('/onboarding');
     return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to onboarding...</p></div>;
  }
  if (!appUserProfile) { 
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading user profile...</p></div>;
  }


  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;
  
  const displayedConversations = conversations.filter(convo => 
    convo.id === SHARED_CONVERSATION_ID || 
    convo.isSelfChat || 
    !appUserProfile.hiddenConversationIds?.includes(convo.id)
  );

  // Filter allOtherUsers to exclude those who already have an active 1-on-1 chat
  const activeOneOnOneChatUserIds = new Set(
    displayedConversations
      .filter(c => !c.isGroup && !c.isSelfChat && c.members && c.members.length === 2)
      .map(c => c.members?.find(memberId => memberId !== clerkUserId))
      .filter(id => !!id)
  );
  
  const otherAvailableUsersToChat = allOtherUsers.filter(
    u => !activeOneOnOneChatUserIds.has(u.id)
  );


  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={displayedConversations} 
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onOpenCreateGroupDialog={() => setIsCreateGroupDialogOpen(true)}
          currentUserId={clerkUserId}
          appUserProfile={appUserProfile} 
          onHideConversation={handleHideConversation} 
          allOtherUsers={otherAvailableUsersToChat} // Pass filtered list
          onStartChatWithUser={handleStartChatWithUser} // Pass handler
        />
      </div>
      <div className="flex-1 h-full">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <div className="p-2 border-b">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
              <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2"/>Chat</TabsTrigger>
              <TabsTrigger value="ideas"><Lightbulb className="w-4 h-4 mr-2"/>Idea Storage ({storedIdeas.length})</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
            <ChatArea
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
              onAddIdea={handleAddIdea}
              currentUserId={clerkUserId}
              onDeleteMessageForMe={handleDeleteMessageForMe}
              onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
              allConversationsForSheet={displayedConversations}
              allOtherUsersForSheet={otherAvailableUsersToChat}
              onStartChatWithUserForSheet={handleStartChatWithUser}
              onSelectConversationForSheet={handleSelectConversation}
              onOpenCreateGroupDialogForSheet={() => setIsCreateGroupDialogOpen(true)}
              appUserProfileForSheet={appUserProfile}
              onOpenManageMembersDialogForSheet={handleOpenManageMembersDialog} 
              onHideConversationForSheet={handleHideConversation} 
            />
          </TabsContent>
          <TabsContent value="ideas" className="flex-1 overflow-y-auto p-4">
             <IdeaList ideas={storedIdeas} onDeleteIdea={handleDeleteIdea} />
          </TabsContent>
        </Tabs>
      </div>
      {/* FindUsersDialog is removed */}
      {clerkUserId && user && appUserProfile && (
        <CreateGroupDialog
            isOpen={isCreateGroupDialogOpen}
            onOpenChange={setIsCreateGroupDialogOpen}
            onCreateGroup={handleCreateNewGroupConversation}
            currentUserId={clerkUserId}
            allConversations={conversations} 
            currentUserAppProfile={appUserProfile}
        />
      )}
      {clerkUserId && conversationToManage && user && (
        <ManageGroupMembersDialog
            isOpen={isManageMembersDialogOpen}
            onOpenChange={setIsManageMembersDialogOpen}
            conversation={conversationToManage}
            currentUserId={clerkUserId}
            allConversations={conversations} 
            onAddMembersToGroup={handleAddMembersToGroup}
            onRemoveMemberFromGroup={handleRemoveMemberFromGroup}
        />
      )}
    </div>
  );
}

    