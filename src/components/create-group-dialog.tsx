
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import type { Conversation, ParticipantDetails } from "@/types/chat";
import { UserPlus, Search, ArrowLeft, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SHARED_CONVERSATION_ID = "global-metalai-chat";

interface CreateGroupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateGroup: (groupName: string, members: Array<{ id: string; displayName: string; avatarUrl?: string }>) => void;
  currentUserId: string | null;
  allConversations: Conversation[];
  currentUserAppProfile?: { displayName: string; photoURL?: string } | null;
}

interface SelectableUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export default function CreateGroupDialog({
  isOpen,
  onOpenChange,
  onCreateGroup,
  currentUserId,
  allConversations,
  currentUserAppProfile
}: CreateGroupDialogProps) {
  const [step, setStep] = useState<'name' | 'members'>('name');
  const [groupName, setGroupName] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const availableUsersForGroup = useMemo(() => {
    if (!currentUserId) return [];
    const users: SelectableUser[] = [];
    const addedUserIds = new Set<string>();

    allConversations.forEach(convo => {
      if (convo.id === SHARED_CONVERSATION_ID || convo.isGroup || convo.isSelfChat) {
        return;
      }
      // This is a 1-on-1 chat, find the other user
      const otherMemberId = convo.members?.find(id => id !== currentUserId);
      if (otherMemberId && convo.participantDetails && convo.participantDetails[otherMemberId] && !addedUserIds.has(otherMemberId)) {
        users.push({
          id: otherMemberId,
          displayName: convo.participantDetails[otherMemberId].displayName,
          avatarUrl: convo.participantDetails[otherMemberId].avatarUrl,
        });
        addedUserIds.add(otherMemberId);
      }
    });
    return users.sort((a,b) => a.displayName.localeCompare(b.displayName));
  }, [allConversations, currentUserId]);

  const filteredAvailableUsers = useMemo(() => {
    if (!memberSearchTerm) return availableUsersForGroup;
    return availableUsersForGroup.filter(user =>
      user.displayName.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );
  }, [availableUsersForGroup, memberSearchTerm]);

  useEffect(() => {
    // Reset state when dialog is closed/opened
    if (isOpen) {
      setStep('name');
      setGroupName('');
      setMemberSearchTerm('');
      setSelectedMemberIds(new Set());
    }
  }, [isOpen]);

  const handleNextStep = () => {
    if (!groupName.trim()) {
      toast({ title: "Group Name Required", description: "Please enter a name for your group.", variant: "destructive" });
      return;
    }
    setStep('members');
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleCreateGroupSubmit = () => {
    if (!groupName.trim()) { // Should be caught by next step, but good check
      toast({ title: "Group Name Required", variant: "destructive" });
      setStep('name');
      return;
    }
    if (selectedMemberIds.size === 0) {
      toast({ title: "No Members Selected", description: "Please select at least one member for the group.", variant: "destructive" });
      return;
    }

    const membersToCreate = availableUsersForGroup.filter(user => selectedMemberIds.has(user.id));
    onCreateGroup(groupName.trim(), membersToCreate);
    onOpenChange(false); // Close dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {step === 'name' ? (
                <><Users className="mr-2 h-5 w-5" /> Create New Group</>
            ) : (
                <Button variant="ghost" size="icon" onClick={() => setStep('name')} className="mr-2 h-8 w-8">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            )}
            {step === 'members' && `Add Members to "${groupName}"`}
          </DialogTitle>
          {step === 'name' && (
            <DialogDescription>
              Enter a name for your new group chat. You can add members in the next step.
            </DialogDescription>
          )}
           {step === 'members' && (
            <DialogDescription>
              Select users from your existing chats to add to this group.
            </DialogDescription>
          )}
        </DialogHeader>

        {step === 'name' && (
          <div className="py-4 space-y-3">
            <Label htmlFor="group-name" className="font-semibold">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="E.g., Project Team Alpha"
              className="focus-visible:ring-accent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && groupName.trim()) {
                  e.preventDefault();
                  handleNextStep();
                }
              }}
            />
          </div>
        )}

        {step === 'members' && (
          <div className="py-1 space-y-3 flex flex-col max-h-[60vh]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="flex-grow border rounded-md min-h-[150px]">
              {filteredAvailableUsers.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {availableUsersForGroup.length === 0 ? "You don't have any 1-on-1 chats to add members from." : "No users match your search."}
                </p>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredAvailableUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center p-2 rounded-md hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => handleToggleMember(user.id)}
                    >
                      <Checkbox
                        id={`member-${user.id}`}
                        checked={selectedMemberIds.has(user.id)}
                        onCheckedChange={() => handleToggleMember(user.id)}
                        className="mr-3"
                      />
                      <Avatar className="h-9 w-9 mr-3">
                        <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile avatar" />
                        <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <Label htmlFor={`member-${user.id}`} className="flex-grow cursor-pointer text-sm">
                        {user.displayName}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogClose>
          {step === 'name' && (
            <Button type="button" onClick={handleNextStep} disabled={!groupName.trim()}>
              Next
            </Button>
          )}
          {step === 'members' && (
            <Button type="button" onClick={handleCreateGroupSubmit} disabled={selectedMemberIds.size === 0}>
              Create Group ({selectedMemberIds.size} selected)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
