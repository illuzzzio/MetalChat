"use client";

import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot } from "lucide-react"; // Using Bot for 'other' as a placeholder
import Image from "next/image";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.sender === "user";
  const avatarInitial = message.sender === "user" ? "U" : message.sender.substring(0,1).toUpperCase() || "O";

  return (
    <div
      className={cn(
        "flex items-end gap-2 py-2 animate-message-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={`https://placehold.co/40x40.png?text=${avatarInitial}`} alt={message.sender} data-ai-hint="profile person" />
          <AvatarFallback>{avatarInitial}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2 shadow-md",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        {message.type === "text" && <p className="text-sm font-body">{message.text}</p>}
        {message.type === "image" && message.fileUrl && (
          <Image
            src={message.fileUrl}
            alt={message.fileName || "Shared image"}
            width={200}
            height={150}
            className="rounded-md object-cover"
            data-ai-hint="chat image"
          />
        )}
        {(message.type === "audio" || message.type === "video") && message.fileName && (
           <p className="text-sm font-body italic">
             [{message.type === "audio" ? "Audio" : "Video"}: {message.fileName}]
           </p>
        )}
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
  );
}
