
"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, Paperclip, Volume2, Video, BotMessageSquare, Brain } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { playSendSound, initTone, addToneStartListener } from '@/lib/sounds';
import type { Message } from '@/types/chat';
import { metalAIImageGenerate } from '@/ai/flows/metalai-image-gen-flow';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSendMessage: (
    conversationId: string,
    text: string,
    type?: Message['type'],
    file?: File,
    imageDataUri?: string
  ) => void;
  conversationId: string | null;
}

export default function ChatInput({ onSendMessage, conversationId }: ChatInputProps) {
  const [messageText, setMessageText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{
    text: string;
    type: Message['type'];
    file?: File;
    action: 'send' | 'generateImage';
  } | null>(null);
  
  const [isImageGenModalOpen, setIsImageGenModalOpen] = useState(false);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  React.useEffect(() => {
    const initializeAudio = async () => {
      await initTone();
    };
    initializeAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  const prepMessageForConfirmation = (text: string, type: Message['type'], file?: File, action: 'send' | 'generateImage' = 'send') => {
    if (!conversationId) {
        toast({ title: "Error", description: "No conversation selected.", variant: "destructive" });
        return;
    }
    if (action === 'send' && !text.trim() && !file) return;
    
    setPendingMessage({ text, type, file, action });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmSend = () => {
    if (pendingMessage && conversationId) {
      if (pendingMessage.action === 'send') {
        onSendMessage(conversationId, pendingMessage.text, pendingMessage.type, pendingMessage.file);
        if (pendingMessage.type === 'text') setMessageText("");
        playSendSound();
      }
    }
    setIsConfirmDialogOpen(false);
    setPendingMessage(null);
  };
  
  const handleActualImageGeneration = async () => {
    if (!conversationId || !imageGenPrompt.trim()) {
      toast({ title: "Image Generation", description: "Please enter a prompt.", variant: "destructive" });
      return;
    }
    setIsGeneratingImage(true);
    setIsImageGenModalOpen(false); 

    try {
      const result = await metalAIImageGenerate({ prompt: imageGenPrompt });
      if (result.imageDataUri && !result.error) {
        onSendMessage(conversationId, `AI Image: ${imageGenPrompt}`, 'image', undefined, result.imageDataUri);
        playSendSound();
        toast({ title: "Image Generated", description: "MetalAI has generated an image!" });
      } else {
        toast({ title: "Image Generation Failed", description: result.error || "Could not generate image.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({ title: "Image Generation Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
      setImageGenPrompt("");
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      prepMessageForConfirmation(messageText, 'text');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      let fileType: Message['type'] = 'image'; 
      if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('image/')) fileType = 'image';
      else {
        toast({ title: "Unsupported File", description: "This file type is not supported for direct preview.", variant: "destructive"});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      prepMessageForConfirmation(file.name, fileType, file);
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const openImageGenModal = () => {
    setIsImageGenModalOpen(true);
  }

  return (
    <>
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
          <Button variant="ghost" size="icon" onClick={openImageGenModal} title="Generate Image with MetalAI" className="text-muted-foreground hover:text-accent-foreground">
            <Brain className="h-5 w-5" />
          </Button>
          <Input
            type="text"
            placeholder="Type a message to MetalChat..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 rounded-full px-4 py-2 bg-input focus-visible:ring-accent"
            disabled={isGeneratingImage}
          />
          <Button 
            variant="default" 
            size="icon" 
            onClick={() => prepMessageForConfirmation(messageText, 'text')}
            className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
            aria-label="Send message"
            disabled={(!messageText.trim() && !pendingMessage) || isGeneratingImage}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,audio/*,video/*" />
      </div>

      {/* Confirmation Dialog for Sending Messages/Files */}
      <AlertDialog open={isConfirmDialogOpen && pendingMessage?.action === 'send'} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send this {pendingMessage?.type === 'text' ? 'message' : `file: ${pendingMessage?.file?.name || 'media'}`}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMessage(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal for AI Image Generation Prompt */}
      <AlertDialog open={isImageGenModalOpen} onOpenChange={setIsImageGenModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Image with MetalAI</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a prompt for the image you want MetalAI to create.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., A futuristic city skyline at sunset, brushed metal style"
              value={imageGenPrompt}
              onChange={(e) => setImageGenPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setImageGenPrompt("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActualImageGeneration} disabled={!imageGenPrompt.trim() || isGeneratingImage}>
              {isGeneratingImage ? "Generating..." : "Generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isGeneratingImage && (
         <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="p-4 bg-card rounded-lg shadow-xl">
              <p className="font-semibold animate-pulse">MetalAI is creating your image...</p>
            </div>
         </div>
      )}
    </>
  );
}
