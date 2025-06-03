"use client";

import React, { useState, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, Paperclip, Volume2, Video, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { playSendSound, initTone } from '@/lib/sounds';

interface ChatInputProps {
  onSendMessage: (text: string, type?: 'text' | 'image' | 'audio' | 'video', file?: File) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [messageText, setMessageText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    // Attempt to initialize Tone.js when component mounts or on first interaction
    // This is a common pattern to handle browser audio restrictions
    const initializeAudio = async () => {
      await initTone();
    };
    initializeAudio();
    
    // Also add general listeners as a fallback
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  const addToneStartListener = () => {
    const startAudio = async () => {
      await initTone();
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
    };
    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
    
    return () => {
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
    };
  };


  const handleSend = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim(), 'text');
      setMessageText("");
      playSendSound();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      let fileType: 'image' | 'audio' | 'video' = 'image';
      if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.startsWith('video/')) fileType = 'video';
      
      // For this demo, we'll pass the file object. In a real app, you'd upload it.
      onSendMessage(`Shared ${fileType}: ${file.name}`, fileType, file);
      playSendSound();
      toast({
        title: "File Selected",
        description: `${file.name} is ready to be "sent" (mocked).`,
      });
    }
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  }

  return (
    <div className="p-4 border-t border-border bg-card sticky bottom-0">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent-foreground">
              <Paperclip className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-1 flex gap-1">
            <Button variant="ghost" size="icon" onClick={triggerFileInput} title="Share Image">
              <ImageIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={triggerFileInput} title="Share Audio">
              <Volume2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={triggerFileInput} title="Share Video">
              <Video className="h-5 w-5" />
            </Button>
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 rounded-full px-4 py-2 bg-input focus-visible:ring-accent"
        />
        <Button 
          variant="default" 
          size="icon" 
          onClick={handleSend} 
          className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,audio/*,video/*" />
    </div>
  );
}
