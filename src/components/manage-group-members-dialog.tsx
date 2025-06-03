
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { Conversation, ParticipantDetails, SearchedUser } from "@/types/chat";
import { UserPlus, Search, Users, XCircle, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const SHARED_CONVERSATION_ID = "global-metalai-chat";

interface ManageGroupMembersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  conversation: Conversation | null;
  currentUserId: string | null;
  allConversations: Conversation[]; // To find potential new members
  onAddMembersToGroup: (conversationId: string, membersToAdd: Array<{ id: string; displayName: string; avatarUrl?: string }>) => Promise<void>;
  onRemoveMemberFromGroup: (conversationId: string, memberIdToRemove: string) => Promise<void>;
}

interface SelectableUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export default function ManageGroupMembersDialog({
  isOpen,
  onOpenChange,
  conversation,
  currentUserId,
  allConversations,
  onAddMembersToGroup,
  onRemoveMemberFromGroup,
}: ManageGroupMembersDialogProps) {
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setMemberSearchTerm('');
      setSelectedNewMemberIds(new Set());
      setIsUpdating(false);
    }
  }, [isOpen]);

  const currentMembersDetails: SelectableUser[] = useMemo(() => {
    if (!conversation || !conversation.members || !conversation.participantDetails) return [];
    return conversation.members.map(id => ({
      id,
      displayName: conversation.participantDetails![id]?.displayName || 'Unknown User',
      avatarUrl: conversation.participantDetails![id]?.avatarUrl,
    })).sort((a,b) => a.displayName.localeCompare(b.displayName));
  }, [conversation]);

  const potentialUsersToAdd: SelectableUser[] = useMemo(() => {
    if (!currentUserId || !conversation) return [];
    const existingMemberIds = new Set(conversation.members || []);
    const usersFrom1on1Chats: SelectableUser[] = [];
    const addedUserIds = new Set<string>();

    allConversations.forEach(convo => {
      if (convo.id === SHARED_CONVERSATION_ID || convo.isGroup || convo.isSelfChat || !convo.members || !convo.participantDetails) {
        return;
      }
      const otherMemberId = convo.members.find(id => id !== currentUserId);
      if (otherMemberId && convo.participantDetails[otherMemberId] && !existingMemberIds.has(otherMemberId) && !addedUserIds.has(otherMemberId)) {
        usersFrom1on1Chats.push({
          id: otherMemberId,
          displayName: convo.participantDetails[otherMemberId].displayName,
          avatarUrl: convo.participantDetails[otherMemberId].avatarUrl,
        });
        addedUserIds.add(otherMemberId);
      }
    });
    return usersFrom1on1Chats.sort((a,b) => a.displayName.localeCompare(b.displayName));
  }, [allConversations, currentUserId, conversation]);
  
  const filteredPotentialUsers = useMemo(() => {
    if (!memberSearchTerm) return potentialUsersToAdd;
    return potentialUsersToAdd.filter(user =>
      user.displayName.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [potentialUsersToAdd, memberSearchTerm]);

  const handleToggleNewMember = (userId: string) => {
    setSelectedNewMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAddSelectedMembers = async () => {
    if (!conversation || selectedNewMemberIds.size === 0) return;
    setIsUpdating(true);
    const membersToAddDetails = potentialUsersToAdd.filter(user => selectedNewMemberIds.has(user.id));
    try {
      await onAddMembersToGroup(conversation.id, membersToAddDetails);
      setSelectedNewMemberIds(new Set()); // Clear selection
      toast({ title: "Members Added", description: "New members have been added to the group." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to add members.", variant: "destructive" });
      console.error("Failed to add members:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = async (memberIdToRemove: string) => {
    if (!conversation || !currentUserId) return;
    // Basic check: don't allow removing oneself or the creator if they are the only admin (future enhancement)
    // For now, prevent removing if it's the last member or the creator trying to remove themselves this way
    if (conversation.members && conversation.members.length <= 1) {
        toast({title: "Cannot Remove", description: "A group must have at least one member.", variant: "destructive"});
        return;
    }
    if (memberIdToRemove === conversation.createdBy && conversation.members?.length <= 2) { // Example, needs refinement
        // toast({title: "Cannot Remove", description: "The group creator cannot be removed if they are one of the last two members.", variant: "destructive"});
        // return;
    }
     if (memberIdToRemove === currentUserId) {
        toast({title: "Action Not Allowed", description: "You cannot remove yourself using this dialog. To leave a group, a separate 'Leave Group' action would be needed.", variant: "destructive"});
        return;
    }


    setIsUpdating(true);
    try {
      await onRemoveMemberFromGroup(conversation.id, memberIdToRemove);
      toast({ title: "Member Removed", description: "The member has been removed from the group." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove member.", variant: "destructive" });
      console.error("Failed to remove member:", error);
    } finally {
      setIsUpdating(false);
    }
  };


  if (!conversation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" /> Manage Members: {conversation.name}
          </DialogTitle>
          <DialogDescription>
            Add or remove members from this group chat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto space-y-4 pr-2">
            <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Current Members ({currentMembersDetails.length})</h3>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                {currentMembersDetails.length === 0 && <p className="text-xs text-center text-muted-foreground py-4">No members found (this shouldn't happen).</p>}
                {currentMembersDetails.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatarUrl} alt={member.displayName} data-ai-hint="profile avatar" />
                        <AvatarFallback>{member.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{member.displayName}{member.id === currentUserId ? " (You)" : ""}{member.id === conversation.createdBy ? <span className="text-xs text-accent ml-1">(Creator)</span> : ""}</span>
                    </div>
                    {member.id !== currentUserId && member.id !== conversation.createdBy && conversation.members && conversation.members.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)} disabled={isUpdating} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    </div>
                ))}
                </ScrollArea>
            </div>

            <Separator />

            <div>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Add New Members</h3>
                <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users to add..."
                        value={memberSearchTerm}
                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                        className="pl-8"
                        disabled={isUpdating}
                    />
                </div>
                <ScrollArea className="h-[150px] border rounded-md p-2">
                {filteredPotentialUsers.length === 0 ? (
                    <p className="p-4 text-center text-xs text-muted-foreground">
                    {potentialUsersToAdd.length === 0 ? "No new users from your 1-on-1 chats to add." : "No users match your search."}
                    </p>
                ) : (
                    filteredPotentialUsers.map(user => (
                    <div
                        key={user.id}
                        className="flex items-center p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                        onClick={() => !isUpdating && handleToggleNewMember(user.id)}
                    >
                        <Checkbox
                        id={`add-member-${user.id}`}
                        checked={selectedNewMemberIds.has(user.id)}
                        onCheckedChange={() => handleToggleNewMember(user.id)}
                        className="mr-3"
                        disabled={isUpdating}
                        />
                        <Avatar className="h-7 w-7 mr-2">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile avatar" />
                        <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <label htmlFor={`add-member-${user.id}`} className="text-sm cursor-pointer">{user.displayName}</label>
                    </div>
                    ))
                )}
                </ScrollArea>
                <Button 
                    onClick={handleAddSelectedMembers} 
                    disabled={selectedNewMemberIds.size === 0 || isUpdating} 
                    className="w-full mt-3"
                >
                  {isUpdating && selectedNewMemberIds.size > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Add Selected ({selectedNewMemberIds.size})
                </Button>
            </div>
        </div>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Close"}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
