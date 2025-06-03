
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

  useEffect(() => {
    if (!isOpen) { 
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
      setError(null); // Clear previous errors at the start of a new search attempt
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || `Search failed: ${response.statusText || response.status}`);
        }

        if (responseData && Array.isArray(responseData.users)) {
          setSearchResults(responseData.users.filter((user: SearchedUser) => user.id !== currentUserId));
        } else {
          console.warn("Search API response OK, but `users` array is missing or not an array:", responseData);
          setSearchResults([]);
          // Consider setting a user-friendly error if the structure is unexpected but response was ok
          setError("Received an unexpected response from the server while searching for users.");
        }
      } catch (err) {
        console.error("Failed to search users (useEffect catch):", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred during user search.";
        setError(message);
        setSearchResults([]);
        // Toast is shown when error state is updated and displayed in UI
        // toast({ title: "Search Error", description: message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOpen, toast, currentUserId]);

  const handleUserSelect = (user: SearchedUser) => {
    onStartChatWithUser(user);
    onOpenChange(false); 
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><UserPlus /> Add Friend / Start Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Search for users by username or email to start a new chat (min. 2 characters).
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
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
