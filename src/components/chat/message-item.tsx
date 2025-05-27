
'use client';

import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import Image from 'next/image';
import { FileText, Download, PlayCircle, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MessageItemProps {
  message: Message; // Expects timestamp as string
  isCurrentUser: boolean;
}

export function MessageItem({ message, isCurrentUser }: MessageItemProps) {
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const renderMedia = () => {
    if (!message.mediaUrl || !message.mediaType) return null;

    switch (message.mediaType) {
      case 'image':
        return (
          <Image
            src={message.mediaUrl}
            alt={message.fileName || 'Shared image'}
            width={300}
            height={200}
            className="rounded-lg object-cover mt-2"
            data-ai-hint="chat image"
          />
        );
      case 'video':
        return (
          <div className="mt-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
            <PlayCircle className="w-10 h-10 text-accent" />
            <div>
              <p className="font-medium text-sm">{message.fileName || 'Shared video'}</p>
              <Button variant="link" size="sm" className="p-0 h-auto text-accent hover:underline" asChild>
                <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">Watch Video</a>
              </Button>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
             <Mic className="w-8 h-8 text-accent" />
            <div>
              <p className="font-medium text-sm">{message.fileName || 'Shared audio'}</p>
              <audio controls src={message.mediaUrl} className="w-full max-w-xs h-10 mt-1"></audio>
            </div>
          </div>
        );
      case 'file':
        return (
          <div className="mt-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
            <FileText className="w-8 h-8 text-accent" />
            <div className="flex-grow overflow-hidden">
              <p className="font-medium text-sm truncate">{message.fileName || 'Shared file'}</p>
              <Button variant="link" size="sm" className="p-0 h-auto text-accent hover:underline" asChild>
                <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" download={message.fileName}>
                  Download <Download className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2 my-3 animate-fadeIn',
        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {!isCurrentUser && (
        <Avatar className="w-8 h-8 self-start shrink-0">
          <AvatarImage src={message.senderPhotoURL || undefined} alt={message.senderDisplayName || 'User'} data-ai-hint="avatar person" />
          <AvatarFallback>{getInitials(message.senderDisplayName)}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-[70%] p-3 rounded-xl shadow-md transition-all duration-300',
          isCurrentUser
            ? 'bg-accent text-accent-foreground rounded-br-none'
            : 'bg-card text-card-foreground rounded-bl-none'
        )}
        style={{ opacity: 0, animation: 'fadeInMessage 0.3s ease-out forwards' }}
      >
        {!isCurrentUser && (
          <p className="text-xs font-semibold mb-1 text-muted-foreground">
            {message.senderDisplayName || 'Anonymous'}
          </p>
        )}
        {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        {renderMedia()}
        <p
          className={cn(
            'text-xs mt-1.5',
            isCurrentUser ? 'text-accent-foreground/70' : 'text-muted-foreground/70',
            message.text || message.mediaUrl ? 'text-right' : 'text-left'
          )}
        >
          {format(new Date(message.timestamp), 'p')} {/* Parse ISO string to Date */}
        </p>
      </div>
      <style jsx global>{`
        @keyframes fadeInMessage {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
