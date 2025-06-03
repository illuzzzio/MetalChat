
"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
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

interface AddFriendDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function AddFriendDialog({ isOpen, onOpenChange }: AddFriendDialogProps) {
  const [identifier, setIdentifier] = useState(""); // Can be email or username
  const { toast } = useToast();

  const handleFindUser = () => {
    // Placeholder for actual find user logic
    if (!identifier.trim()) {
      toast({ title: "Input Required", description: "Please enter an email or username.", variant: "destructive" });
      return;
    }
    toast({
      title: "Feature Coming Soon",
      description: `Searching for user "${identifier}" is not yet implemented.`,
    });
    // onOpenChange(false); // Keep dialog open or close as desired
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Friend</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the email or username of the user you want to add.
            This feature is a placeholder and will be fully implemented later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="identifier" className="text-right">
              Email/Username
            </Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="col-span-3"
              placeholder="e.g., user@example.com or MetalHead23"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setIdentifier(""); onOpenChange(false); }}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleFindUser} disabled={!identifier.trim()}>
            Find User (Placeholder)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
