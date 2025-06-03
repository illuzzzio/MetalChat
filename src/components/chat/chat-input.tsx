
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Image as ImageIcon, Paperclip, Volume2, Video, Brain, Mic, StopCircle, Play, Copy, Trash2, Download, Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { playSendSound, initTone, addToneStartListener } from '@/lib/sounds';
import type { Message, Idea } from '@/types/chat';
import { metalAIImageGenerate } from '@/ai/flows/metalai-image-gen-flow';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSendMessage: (
    conversationId: string,
    text: string,
    type?: Message['type'],
    file?: File,
    imageDataUri?: string,
    duration?: number,
  ) => void;
  conversationId: string | null;
  onAddIdea: (idea: Idea) => void;
  currentUserId: string | null;
}

export default function ChatInput({ onSendMessage, conversationId, onAddIdea, currentUserId }: ChatInputProps) {
  const [messageText, setMessageText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [isImageGenModalOpen, setIsImageGenModalOpen] = useState(false);
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null); // null: unknown, true: granted, false: denied
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    const initializeAudio = async () => { await initTone(); };
    initializeAudio();
    const removeListeners = addToneStartListener();

    // Check initial microphone permission
    navigator.permissions?.query({ name: 'microphone' as PermissionName }).then(permissionStatus => {
      setHasMicPermission(permissionStatus.state === 'granted');
      permissionStatus.onchange = () => {
        setHasMicPermission(permissionStatus.state === 'granted');
      };
    }).catch(() => {
        setHasMicPermission(null); 
    });
    
    return removeListeners;
  }, []);

  const handleSendMessageClick = () => {
    if (!conversationId || !currentUserId) {
      toast({ title: "Error", description: "No conversation selected or user not identified.", variant: "destructive" });
      return;
    }
    if (!messageText.trim()) return;
    
    onSendMessage(conversationId, messageText, 'text');
    setMessageText("");
    playSendSound();
    if (textareaRef.current) textareaRef.current.focus();
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
        const newIdea: Idea = {
          id: `idea-${Date.now()}`,
          prompt: imageGenPrompt,
          imageDataUri: result.imageDataUri,
          timestamp: new Date().toISOString(),
        };
        onAddIdea(newIdea);
        playSendSound();
        toast({ title: "Image Generated!", description: "MetalAI created an image. Check your Idea Storage." });
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && conversationId && currentUserId) {
      let fileType: Message['type'] = 'image'; 
      if (file.type.startsWith('audio/')) fileType = 'audio';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('image/')) fileType = 'image';
      else {
        toast({ title: "Unsupported File", description: "This file type is not supported for direct preview.", variant: "destructive"});
        if(fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      onSendMessage(conversationId, file.name, fileType, file);
      playSendSound();
    }
    if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
  };

  const triggerFileInput = (acceptType: string = "image/*,audio/*,video/*") => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current?.click();
    }
  };

  const openImageGenModal = () => {
    setIsImageGenModalOpen(true);
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({title: "Unsupported Browser", description: "Audio recording is not supported by your browser.", variant: "destructive"});
        setHasMicPermission(false);
        return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        if (audioChunksRef.current.length > 0) {
            const audioBlobData = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // or audio/ogg; codecs=opus
            setAudioBlob(audioBlobData);
            const url = URL.createObjectURL(audioBlobData);
            setAudioUrl(url);
        } else {
            setAudioBlob(null);
            setAudioUrl(null);
            toast({title: "Recording Empty", description: "No audio was recorded.", variant: "destructive"})
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
      toast({ title: "Recording Started", description: "Microphone is active."});
    } catch (err) {
      console.error("Error starting recording:", err);
      setHasMicPermission(false);
      toast({ title: "Microphone Error", description: "Could not access microphone. Please check permissions in your browser settings.", variant: "destructive"});
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      toast({ title: "Recording Stopped", description: `Duration: ${formatTime(recordingTime)}`});
    }
  };

  const handleSendAudio = () => {
    if (audioBlob && conversationId && currentUserId) {
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: audioBlob.type });
      onSendMessage(conversationId, audioFile.name, 'audio', audioFile, undefined, recordingTime);
      playSendSound();
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePaste = useCallback(async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!conversationId || !currentUserId) return;
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          event.preventDefault(); 
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              if (e.target?.result && typeof e.target.result === 'string') {
                 onSendMessage(conversationId, `Pasted Image ${new Date().toISOString()}.png`, 'image', undefined, e.target.result);
                 toast({ title: "Image Pasted", description: "Pasted image sent."});
              }
            };
            reader.readAsDataURL(blob);
            break; 
          }
        }
      }
    }
  }, [conversationId, onSendMessage, currentUserId, toast]);


  return (
    <>
      <div className="p-4 border-t border-border bg-card sticky bottom-0">
        {audioUrl && !isRecording && (
          <div className="mb-2 p-2 border rounded-md bg-muted flex items-center justify-between animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <audio src={audioUrl} controls className="h-8" />
              <span className="text-sm text-muted-foreground">Recording ({formatTime(recordingTime || 0)})</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSendAudio} size="sm" variant="default">
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
              <Button onClick={() => { setAudioUrl(null); setAudioBlob(null); setRecordingTime(0); }} size="sm" variant="outline">
                Discard
              </Button>
            </div>
          </div>
        )}

        {isRecording && (
          <div className="mb-2 p-2 border rounded-md bg-destructive/20 flex items-center justify-between animate-in fade-in-0 duration-200">
            <div className="flex items-center gap-2 text-destructive">
              <Mic className="h-5 w-5 animate-pulse" />
              <span>Recording: {formatTime(recordingTime)}</span>
            </div>
            <Button onClick={stopRecording} variant="destructive" size="icon">
              <StopCircle className="h-5 w-5" />
            </Button>
          </div>
        )}

        <div className="flex items-end gap-2"> {/* items-end for textarea auto-height */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent-foreground self-end mb-1" disabled={isRecording || isGeneratingImage || !conversationId}>
                <Paperclip className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 flex gap-1 mb-1">
              <Button variant="ghost" size="icon" onClick={() => triggerFileInput("image/*")} title="Share Image File">
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => triggerFileInput("audio/*")} title="Share Audio File">
                <Volume2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => triggerFileInput("video/*")} title="Share Video File">
                <Video className="h-5 w-5" />
              </Button>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={isRecording ? stopRecording : startRecording} 
            title={isRecording ? "Stop Recording" : "Start Recording"}
            className={cn(
                "self-end mb-1",
                isRecording ? "text-destructive hover:bg-destructive/20" : "text-muted-foreground hover:text-accent-foreground",
                hasMicPermission === false && !isRecording && "text-muted-foreground/50 cursor-not-allowed"
            )}
            disabled={isGeneratingImage || (hasMicPermission === false && !isRecording) || !conversationId}
          >
            {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={openImageGenModal} title="Generate Image with MetalAI" className="text-muted-foreground hover:text-accent-foreground self-end mb-1" disabled={isRecording || isGeneratingImage || !conversationId}>
            <Brain className="h-5 w-5" />
          </Button>

          <Textarea
            ref={textareaRef}
            placeholder={isRecording ? "Recording audio..." : (hasMicPermission === false ? "Mic disabled. Type..." : "Type a message to MetalChat...")}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onPaste={handlePaste}
            className="flex-1 rounded-lg px-4 py-2 bg-input focus-visible:ring-accent min-h-[40px] max-h-[120px] resize-none" // Adjust min/max height as needed
            rows={1} // Start with 1 row, will auto-expand
            disabled={isGeneratingImage || isRecording || !!audioUrl || !conversationId}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && messageText.trim() && !isRecording && !audioUrl) {
                e.preventDefault(); 
                handleSendMessageClick();
              }
            }}
          />
          <Button 
            variant="default" 
            size="icon" 
            onClick={handleSendMessageClick}
            className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground self-end mb-1"
            aria-label="Send message"
            disabled={!messageText.trim() || isGeneratingImage || isRecording || !!audioUrl || !conversationId}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>

      <AlertDialog open={isImageGenModalOpen} onOpenChange={setIsImageGenModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Image with MetalAI</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a prompt for the image you want MetalAI to create. This image will be saved to your Idea Storage.
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
            <AlertDialogCancel onClick={() => {setIsImageGenModalOpen(false); setImageGenPrompt("");}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActualImageGeneration} disabled={!imageGenPrompt.trim() || isGeneratingImage}>
              {isGeneratingImage ? "Generating..." : "Generate & Save to Ideas"}
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
