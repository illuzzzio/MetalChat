
"use client";

import type { Idea } from "@/types/chat";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, CalendarDays, Copy, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface IdeaListProps {
  ideas: Idea[];
  onDeleteIdea: (ideaId: string) => void;
}

export default function IdeaList({ ideas, onDeleteIdea }: IdeaListProps) {
  const { toast } = useToast();

  if (!ideas || ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
        <Lightbulb className="w-16 h-16 mb-4 text-primary" />
        <h2 className="text-2xl font-headline mb-2">Your Idea Storage is Empty</h2>
        <p className="font-body">Generated images will appear here. Try creating some with MetalAI!</p>
      </div>
    );
  }

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
      .then(() => toast({ title: "Prompt Copied!", description: "The prompt has been copied to your clipboard." }))
      .catch(err => toast({ title: "Copy Failed", description: "Could not copy prompt.", variant: "destructive" }));
  };

  const handleDownloadImage = (imageDataUri: string, prompt: string) => {
    if (!imageDataUri) {
        toast({title: "Download Error", description: "Image data is not available.", variant: "destructive"});
        return;
    }
    const link = document.createElement('a');
    link.href = imageDataUri;
    // Sanitize prompt for filename
    const filename = prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'metalai_image';
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Image Downloading...", description: "Your image has started downloading." });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ideas.map((idea) => (
          <Card key={idea.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-md font-headline truncate" title={idea.prompt}>
                Prompt:
              </CardTitle>
              <CardDescription className="text-xs h-10 overflow-hidden text-ellipsis leading-tight line-clamp-2">
                {idea.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-0 aspect-[4/3] bg-muted/30">
              {idea.imageDataUri ? (
                <Image
                  src={idea.imageDataUri}
                  alt={`Generated image for prompt: ${idea.prompt.substring(0, 50)}...`}
                  width={400} 
                  height={300} 
                  className="object-contain w-full h-full"
                  unoptimized // Important for data URIs
                  data-ai-hint="ai generated idea"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Lightbulb className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground p-2 border-t flex flex-col items-start gap-2">
                <div className="flex items-center text-xs w-full">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    <span className="truncate">
                        {new Date(idea.timestamp).toLocaleDateString()} - {new Date(idea.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <div className="flex w-full gap-1">
                    <Button variant="outline" size="sm" className="flex-1 min-w-0" onClick={() => handleCopyPrompt(idea.prompt)}>
                        <Copy className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/> <span className="truncate">Copy</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 min-w-0" onClick={() => handleDownloadImage(idea.imageDataUri, idea.prompt)} disabled={!idea.imageDataUri}>
                        <Download className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/> <span className="truncate">DL</span>
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1 min-w-0" onClick={() => onDeleteIdea(idea.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1 sm:mr-1.5"/> <span className="truncate">Del</span>
                    </Button>
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
