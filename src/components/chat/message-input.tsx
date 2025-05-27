'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, SendHorizonal, Mic } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MessageInputProps {
  onSendMessage: (text: string, file?: File) => Promise<void>;
  chatId: string; // To associate messages with a chat
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, chatId, disabled }: MessageInputProps) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !file) || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSendMessage(text.trim(), file || undefined);
      setText('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset file input
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Potentially show a toast notification for error
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      // Optionally, focus the text input or show a preview
      setText(e.target.files[0].name); // Show file name in input as temporary feedback
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // TODO: Implement voice recording functionality
  const handleVoiceRecord = () => {
    console.log("Voice recording started/stopped");
    // This would involve using MediaRecorder API
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-border bg-card transition-all duration-300 ease-in-out"
      style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', backgroundColor: 'hsla(var(--card-hsl) / 0.8)' }}
    >
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={triggerFileInput}
              className="text-muted-foreground hover:text-accent shrink-0"
              disabled={isSending || disabled}
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground">
            <p>Attach file</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" // Example accepted types
      />
      <Input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={file ? `File: ${file.name}` : "Type a message..."}
        className="flex-grow bg-input border-border focus:border-accent focus:ring-accent text-base placeholder:text-muted-foreground/80"
        disabled={isSending || disabled}
        autoComplete="off"
      />
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={handleVoiceRecord} 
              className="text-muted-foreground hover:text-accent shrink-0"
              disabled={isSending || disabled}
              aria-label="Record voice message"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground">
            <p>Record voice</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="submit"
              size="icon"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
              disabled={(!text.trim() && !file) || isSending || disabled}
              aria-label="Send message"
            >
              <SendHorizonal className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-popover text-popover-foreground">
            <p>Send</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </form>
  );
}
