
"use client";

import type { Message } from "@/types/chat";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Bot, Brain, FileAudio, Trash2, Users, MoreHorizontal, Download, Copy, Image as ImageIcon, Link as LinkIcon } from "lucide-react"; 
import Image from "next/image";
import React, { useRef, useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MessageItemProps {
  message: Message;
  currentUserId: string | null;
  onDeleteMessageForMe: (conversationId: string, messageId: string) => void;
  onDeleteMessageForEveryone: (conversationId: string, messageId: string) => void;
  conversationId: string | null;
}

export default function MessageItem({ 
    message, 
    currentUserId, 
    onDeleteMessageForMe, 
    onDeleteMessageForEveryone,
    conversationId 
}: MessageItemProps) {
  const isUser = message.sender === "user" && message.userId === currentUserId;
  const isMetalAI = message.sender === "metalAI";
  const isOtherUser = message.sender === "user" && message.userId !== currentUserId;
  const { toast } = useToast();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [formattedDuration, setFormattedDuration] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    if (message.type === 'audio' && message.duration) {
      const minutes = Math.floor(message.duration / 60);
      const seconds = message.duration % 60;
      setFormattedDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }, [message.type, message.duration]);
  
  let avatarInitial = 'U';
  let avatarSrc = `https://placehold.co/40x40.png?text=U`;
  let avatarAlt = "User";
  let aiHint = "profile person";

  if (isUser) {
    avatarInitial = "U"; 
    avatarSrc = `https://placehold.co/40x40.png?text=U&bg=primary&fc=primary-foreground`;
    avatarAlt = "You";
    aiHint = "profile user";
  } else if (isMetalAI) {
    avatarInitial = "AI";
    avatarSrc = `https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground`;
    avatarAlt = "MetalAI";
    aiHint = "robot ai";
  } else if (isOtherUser) {
    avatarInitial = "O"; 
    avatarSrc = `https://placehold.co/40x40.png?text=O&bg=secondary&fc=secondary-foreground`;
    avatarAlt = "Other User";
    aiHint = "profile person";
  }

  // This logic was corrected to use `message.deletedForMe[currentUserId || '']`
  if (message.deletedForMe && message.deletedForMe[currentUserId || ''] && !message.isDeleted) { 
    return null; 
  }

  const handleDeleteForMe = () => {
    if(conversationId && message.id) {
        onDeleteMessageForMe(conversationId, message.id);
    }
    setPopoverOpen(false);
  };

  const handleDeleteForEveryone = () => {
     if(conversationId && message.id && currentUserId === message.userId) { 
        onDeleteMessageForEveryone(conversationId, message.id);
     }
    setPopoverOpen(false);
  };

  const handleCopyText = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text)
        .then(() => toast({ title: "Text Copied", description: "Message copied to clipboard." }))
        .catch(err => toast({ title: "Copy Failed", description: "Could not copy text.", variant: "destructive" }));
    }
    setPopoverOpen(false);
  };

  const handleDownload = () => {
    if (message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || `download-${message.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download Started", description: message.fileName || "Your file is downloading." });
    } else {
      toast({ title: "Download Failed", description: "No file URL available.", variant: "destructive" });
    }
    setPopoverOpen(false);
  };

  const handleCopyImage = async () => {
    if (message.type === 'image' && message.fileUrl) {
      try {
        const response = await fetch(message.fileUrl);
        const blob = await response.blob();
        if (!navigator.clipboard || !navigator.clipboard.write) {
          toast({ title: "Copy Image Failed", description: "Browser does not support copying images directly. Try downloading.", variant: "destructive" });
          setPopoverOpen(false);
          return;
        }
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        toast({ title: "Image Copied", description: "Image copied to clipboard." });
      } catch (err) {
        console.error("Error copying image:", err);
        toast({ title: "Copy Image Failed", description: "Could not copy image. Try downloading it instead.", variant: "destructive" });
      }
    }
    setPopoverOpen(false);
  };

  const handleCopyLink = () => {
    if (message.fileUrl) {
      navigator.clipboard.writeText(message.fileUrl)
        .then(() => toast({ title: "Link Copied", description: "File link copied to clipboard." }))
        .catch(err => toast({ title: "Copy Failed", description: "Could not copy link.", variant: "destructive" }));
    }
    setPopoverOpen(false);
  };


  const messageContent = () => {
    if (message.isLoading) {
      return <p className="text-sm font-body italic animate-pulse">{message.text}</p>;
    }
    if (message.isDeleted) {
       return <p className="text-sm font-body italic text-muted-foreground/70">{message.text}</p>;
    }
    switch (message.type) {
      case "text":
        return <p className="text-sm font-body whitespace-pre-wrap">{message.text}</p>;
      case "image":
        return (
          <div>
            <Image
              src={message.fileUrl || "https://placehold.co/200x150.png?text=No+Image"} 
              alt={message.fileName || "Shared image"}
              width={200} 
              height={150} 
              className="rounded-md object-cover max-w-xs cursor-pointer"
              data-ai-hint={message.sender === 'metalAI' ? 'ai generated' : 'chat image'}
              unoptimized={message.fileUrl?.startsWith('data:image') || message.fileUrl?.startsWith('blob:')} 
              onClick={() => message.fileUrl && window.open(message.fileUrl, '_blank')}
            />
            {message.text && message.text !== message.fileName && <p className="text-xs mt-1 opacity-80">{message.text}</p>}
          </div>
        );
      case "audio":
        return (
          <div className="flex flex-col items-start">
             <div className="flex items-center gap-2 mb-1">
                <FileAudio className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{message.fileName || "Audio Message"}</span>
             </div>
            <audio ref={audioRef} src={message.fileUrl} controls className="max-w-full h-10" />
            {formattedDuration && <p className="text-xs text-muted-foreground/80 mt-1">Duration: {formattedDuration}</p>}
            {message.sender === 'user' && !message.fileUrl?.startsWith('https://firebasestorage.googleapis.com') && !message.fileUrl?.startsWith('data:') && <p className="text-xs text-muted-foreground/70 mt-1">(Local preview. Upload needed for others.)</p>}
          </div>
        );
      case "video":
        return (
           <div>
            <video src={message.fileUrl} controls width="200" className="rounded-md" />
             {message.fileName && <p className="text-xs mt-1 opacity-80">{message.fileName}</p>}
             {message.sender === 'user' && !message.fileUrl?.startsWith('https://firebasestorage.googleapis.com') && !message.fileUrl?.startsWith('data:') && <p className="text-xs text-muted-foreground/70 mt-1">(Local preview. Upload needed for others.)</p>}
           </div>
        );
      default:
        return <p className="text-sm font-body italic">{message.text || "Unsupported message type"}</p>;
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 py-2 animate-message-in group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 self-start mt-1">
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
      
      <div className={cn("flex items-center gap-1", isUser ? "flex-row-reverse" : "flex-row")}>
        <div
          className={cn(
            "max-w-[70%] rounded-lg px-3 py-2 shadow-md",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-none"
              : isMetalAI 
              ? "bg-secondary text-secondary-foreground rounded-bl-none"
              : "bg-card text-card-foreground rounded-bl-none"
          )}
        >
          {messageContent()}
          {!message.isDeleted && !message.isLoading && (
               <p className="text-xs text-muted-foreground/80 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
          )}
        </div>
        
        {!message.isDeleted && !message.isLoading && conversationId && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-6 w-6 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity",
                  popoverOpen && "opacity-100" // Keep visible if popover is open
                )}
                aria-label="Message options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 space-y-0.5">
                {message.type === 'text' && (
                    <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={handleCopyText}>
                      <Copy className="mr-2 h-3.5 w-3.5" /> Copy Text
                    </Button>
                )}
                {(message.type === 'image' || message.type === 'audio' || message.type === 'video') && message.fileUrl && (
                    <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={handleDownload}>
                        <Download className="mr-2 h-3.5 w-3.5" /> Download
                    </Button>
                )}
                {message.type === 'image' && message.fileUrl && navigator.clipboard && navigator.clipboard.write && (
                    <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={handleCopyImage}>
                        <ImageIcon className="mr-2 h-3.5 w-3.5" /> Copy Image
                    </Button>
                )}
                {(message.type === 'audio' || message.type === 'video') && message.fileUrl && (
                     <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={handleCopyLink}>
                        <LinkIcon className="mr-2 h-3.5 w-3.5" /> Copy Link
                    </Button>
                )}

                <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={handleDeleteForMe}>
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete for me
                </Button>
                {isUser && ( // Only show "Delete for everyone" if the current user is the sender
                  <Button variant="ghost" size="sm" className="w-full justify-start text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleDeleteForEveryone}>
                      <Users className="mr-2 h-3.5 w-3.5" /> Delete for everyone
                  </Button>
                )}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 self-start mt-1">
          <AvatarImage src={avatarSrc} alt={avatarAlt} data-ai-hint={aiHint} />
          <AvatarFallback>{avatarInitial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

