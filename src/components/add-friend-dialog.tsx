
"use client";

// THIS FILE IS NO LONGER USED AND CAN BE DELETED.
// The functionality of finding users to start chats has been moved directly
// into the ChatSidebar by fetching all users and displaying them.

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
import { Button } from './ui/button';
import type { SearchedUser } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Users, MessageSquarePlus, Search as SearchIcon } from 'lucide-react';

interface FindUsersDialogProps { 
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onStartChatWithUser: (user: SearchedUser) => void;
  currentUserId: string | null;
}

export default function FindUsersDialog({ isOpen, onOpenChange, onStartChatWithUser, currentUserId }: FindUsersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [allFetchedUsers, setAllFetchedUsers] = useState<SearchedUser[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<SearchedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (query?: string) => {
    if (!currentUserId) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchUrl = query ? `/api/users/search?query=${encodeURIComponent(query)}` : '/api/users/search';
      const response = await fetch(fetchUrl);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Search failed: ${response.statusText || response.status}`);
      }

      if (responseData && Array.isArray(responseData.users)) {
        const users = responseData.users.filter((user: SearchedUser) => user.id !== currentUserId);
        if (!query) { 
            setAllFetchedUsers(users);
        }
        setDisplayedUsers(users); 
      } else {
        console.warn("Search API response OK, but `users` array is missing or not an array:", responseData);
        setAllFetchedUsers([]);
        setDisplayedUsers([]);
        setError("Received an unexpected response from the server while searching for users.");
      }
    } catch (err) {
      console.error("Failed to search users:", err);
      const message = err instanceof Error ? err.message : "An unknown error occurred during user search.";
      setError(message);
      setAllFetchedUsers([]);
      setDisplayedUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchUsers(); 
    } else if (!isOpen) {
      setSearchQuery("");
      setAllFetchedUsers([]);
      setDisplayedUsers([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, currentUserId, fetchUsers]);

  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery.trim() === "") {
        setDisplayedUsers(allFetchedUsers.filter((user: SearchedUser) => user.id !== currentUserId));
        setError(null);
        return;
    }
    
    if (searchQuery.trim().length < 2 && searchQuery.trim().length > 0) {
      setDisplayedUsers([]); 
      setError("Please enter at least 2 characters to search.");
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
        if (searchQuery.trim().length >= 2) {
             fetchUsers(searchQuery.trim());
        }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOpen, fetchUsers, allFetchedUsers, currentUserId]);


  const handleUserSelect = (user: SearchedUser) => {
    onStartChatWithUser(user);
    onOpenChange(false); 
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2"><Users /> Find Users / Start New Chat</AlertDialogTitle> 
          <AlertDialogDescription>
            Search for users to start a new chat. All registered users are discoverable.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-8"
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

          {!isLoading && !error && displayedUsers.length > 0 && (
            <ScrollArea className="h-[200px] border rounded-md">
              <div className="p-2 space-y-1">
                {displayedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.imageUrl} alt={user.username || user.primaryEmailAddress || 'User'} data-ai-hint="profile avatar" />
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
          
          {!isLoading && !error && displayedUsers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {searchQuery.trim().length > 0 ? "No users found matching your query." : (allFetchedUsers.length > 0 ? "No users match your filter." : "No other users found.")}
            </p>
          )}

        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { onOpenChange(false); }}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

    