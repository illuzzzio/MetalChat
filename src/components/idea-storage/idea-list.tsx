
"use client";

import type { Idea } from "@/types/chat";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, CalendarDays } from "lucide-react";

interface IdeaListProps {
  ideas: Idea[];
}

export default function IdeaList({ ideas }: IdeaListProps) {
  if (!ideas || ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
        <Lightbulb className="w-16 h-16 mb-4 text-primary" />
        <h2 className="text-2xl font-headline mb-2">Your Idea Storage is Empty</h2>
        <p className="font-body">Generated images will appear here. Try creating some with MetalAI!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
        {ideas.map((idea) => (
          <Card key={idea.id} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="text-lg font-headline truncate" title={idea.prompt}>
                Prompt:
              </CardTitle>
              <CardDescription className="text-sm h-12 overflow-hidden text-ellipsis leading-tight line-clamp-2">
                {idea.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center p-0">
              {idea.imageDataUri ? (
                <Image
                  src={idea.imageDataUri}
                  alt={`Generated image for prompt: ${idea.prompt.substring(0, 50)}...`}
                  width={300}
                  height={300}
                  className="object-contain w-full h-auto max-h-64"
                  unoptimized // Important for data URIs
                  data-ai-hint="ai generated idea"
                />
              ) : (
                <div className="w-full h-48 bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground">No image available</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="text-xs text-muted-foreground p-3 border-t">
                <div className="flex items-center">
                    <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                    {new Date(idea.timestamp).toLocaleDateString()} - {new Date(idea.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
