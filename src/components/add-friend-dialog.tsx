
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import type { SearchedUser } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from './ui/scroll-area';
import { Loader2, UserPlus, MessageSquarePlus } from 'lucide-react';

interface AddFriendDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartChatWithUser: (user: SearchedUser) => void;
  currentUserId: string | null;
}

export default function AddFriendDialog({ isOpen, onOpenChange, onStartChatWithUser, currentUserId }: AddFriendDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Debounce search
  useEffect(() => {
    if (!isOpen) { // Reset when dialog closes
      setSearchQuery("");
      setSearchResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data = await response.json();
        setSearchResults(data.users.filter((user: SearchedUser) => user.id !== currentUserId));
      } catch (err) {
        console.error("Failed to search users:", err);
        setError(err instanceof Error ? err.message : "Failed to search users.");
        setSearchResults([]);
        toast({ title: "Search Error", description: err instanceof Error ? err.message : "Could not fetch users.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOpen, toast, currentUserId]);

  const handleUserSelect = (user: SearchedUser) => {
    onStartChatWithUser(user);
    onOpenChange(false); // Close dialog after selecting
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><UserPlus /> Add Friend / Start Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Search for users by username or email to start a new chat.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="search-query" className="sr-only">
              Search by username or email
            </Label>
            <Input
              id="search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter username or email..."
              className="w-full"
            />
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="ml-2 text-muted-foreground">Searching...</p>
            </div>
          )}

          {error && !isLoading && (
            <p className="text-sm text-destructive text-center py-2">{error}</p>
          )}

          {!isLoading && !error && searchResults.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.imageUrl} alt={user.username || user.primaryEmailAddress} data-ai-hint="profile avatar" />
                        <AvatarFallback>
                          {user.username?.[0]?.toUpperCase() || user.primaryEmailAddress?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium truncate">{user.username || 'Unnamed User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress || 'No email'}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleUserSelect(user)} title={`Chat with ${user.username || user.primaryEmailAddress}`}>
                      <MessageSquarePlus className="h-4 w-4 mr-1 sm:mr-2" /> Chat
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {!isLoading && !error && searchQuery.trim().length >=2 && searchResults.length === 0 && (
             <p className="text-sm text-muted-foreground text-center py-2">No users found matching your query.</p>
          )}

        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { onOpenChange(false); }}>Cancel</AlertDialogCancel>
          {/* Action button is now part of the search results */}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
