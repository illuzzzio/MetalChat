
"use client";

import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot, Brain } from "lucide-react"; 
import Image from "next/image";

interface MessageItemProps {
  message: Message;
}

const MetalAIIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
    <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3z"/>
    <circle cx="12" cy="12" r="1.5"/>
    <path d="M7 12h2v2H7zm8 0h2v2h-2zM11 7h2v2h-2zm0 8h2v2h-2z"/>
  </svg>
);


export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.sender === "user";
  const isMetalAI = message.sender === "metalAI";
  
  let avatarInitial = "O";
  let avatarSrc = `https://placehold.co/40x40.png?text=O`;
  let avatarAlt = "Other User";
  let aiHint = "profile person";

  if (isUser) {
    avatarInitial = "U";
    avatarSrc = `https://placehold.co/40x40.png?text=U`;
    avatarAlt = "User";
    aiHint = "profile user";
  } else if (isMetalAI) {
    avatarInitial = "AI";
    // avatarSrc is handled by direct SVG rendering below
    avatarAlt = "MetalAI";
    aiHint = "robot ai";
  }


  return (
    <div
      className={cn(
        "flex items-end gap-2 py-2 animate-message-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          {isMetalAI ? (
            <div className="flex items-center justify-center h-full w-full rounded-full bg-accent text-accent-foreground p-1.5">
              <Brain className="h-5 w-5" />
            </div>
          ) : (
            <>
              <AvatarImage src={avatarSrc} alt={avatarAlt} data-ai-hint={aiHint} />
              <AvatarFallback>{avatarInitial}</AvatarFallback>
            </>
          )}
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2 shadow-md",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : isMetalAI 
            ? "bg-secondary text-secondary-foreground rounded-bl-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {message.isLoading ? (
          <p className="text-sm font-body italic animate-pulse">{message.text}</p>
        ) : message.type === "text" ? (
          <p className="text-sm font-body">{message.text}</p>
        ) : message.type === "image" && message.fileUrl ? (
          <Image
            src={message.fileUrl} // Handles both regular URLs and data URIs
            alt={message.fileName || "Shared image"}
            width={200} // Adjust as needed
            height={150} // Adjust as needed
            className="rounded-md object-cover"
            data-ai-hint={message.sender === 'metalAI' ? 'ai generated' : 'chat image'}
            unoptimized={message.fileUrl.startsWith('data:image')} // Important for data URIs
          />
        ) : (message.type === "audio" || message.type === "video") && message.fileName ? (
           <p className="text-sm font-body italic">
             [{message.type === "audio" ? "Audio" : "Video"}: {message.fileName}]
             {message.type === "video" && <span className="text-xs block">(Preview only, real-time sharing not fully implemented)</span>}
           </p>
        ) : null }
        <p className="text-xs text-muted-foreground/80 mt-1 text-right">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="https://placehold.co/40x40.png?text=U" alt="User" data-ai-hint="profile user" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </div>
  