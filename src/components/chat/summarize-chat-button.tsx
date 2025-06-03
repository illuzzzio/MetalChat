"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface SummarizeChatButtonProps {
  onSummarize: () => void;
}

export default function SummarizeChatButton({ onSummarize }: SummarizeChatButtonProps) {
  return (
    <Button variant="ghost" size="icon" onClick={onSummarize} aria-label="Summarize Chat">
      <Sparkles className="h-5 w-5 text-accent" />
    </Button>
  );
}
