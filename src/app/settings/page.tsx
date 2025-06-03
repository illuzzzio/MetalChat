
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/chat';
import { ArrowLeft, UserCircle, Camera } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

const LOCAL_STORAGE_PROFILE_KEY_PREFIX = "metalChatUserProfile_";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null); 
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); 
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const { user, isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
        // Middleware should handle redirect
        return;
    }

    const storedProfileString = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${user.id}`);
    if (storedProfileString) {
      try {
        const profile: UserProfile = JSON.parse(storedProfileString);
        setCurrentProfile(profile);
        setDisplayName(profile.displayName);
        setPhotoPreview(profile.photoURL || user.imageUrl || null);
      } catch (e) {
        console.error("Failed to parse profile from localStorage", e);
        // Fallback if parsing fails
        const fallbackProfile: UserProfile = {
            clerkUserId: user.id,
            displayName: user.fullName || user.username || '',
            photoURL: user.imageUrl || undefined,
            hiddenConversationIds: []
        };
        setCurrentProfile(fallbackProfile);
        setDisplayName(fallbackProfile.displayName);
        setPhotoPreview(fallbackProfile.photoURL || null);
      }
    } else {
      // No app-specific profile, use Clerk's data and initialize
      const initialProfile: UserProfile = {
          clerkUserId: user.id,
          displayName: user.fullName || user.username || '',
          photoURL: user.imageUrl || undefined,
          hiddenConversationIds: []
      };
      setCurrentProfile(initialProfile);
      setDisplayName(initialProfile.displayName);
      setPhotoPreview(initialProfile.photoURL || null);
    }
  }, [user, isLoaded, isSignedIn]);

  const handleSaveProfile = () => {
    if (!user?.id || !currentProfile) {
        toast({ title: "Error", description: "User session or profile not found.", variant: "destructive" });
        return;
    }
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const updatedProfile: UserProfile = {
      ...currentProfile, // Preserve existing fields like hiddenConversationIds
      displayName: displayName.trim(),
      photoURL: photoPreview || undefined, 
    };

    localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${user.id}`, JSON.stringify(updatedProfile));
    setCurrentProfile(updatedProfile); // Update state
    toast({
      title: 'Profile Updated',
      description: 'Your display name and local photo preview have been saved.',
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // Max 2MB for preview/upload
        toast({ title: "Image Too Large", description: "Please select an image smaller than 2MB.", variant: "destructive"});
        return;
      }
      setProfilePhotoFile(file); // Store the file object for potential upload
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string); // This will be a data URI
      };
      reader.readAsDataURL(file);
      toast({ title: "Image Selected (Local Preview)", description: "Image is previewed locally. Save changes to update. Actual upload to Clerk not yet implemented via this page."});
    }
  };
  
  if (!isLoaded) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading settings...</p></div>;
  }
  if (!isSignedIn) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Please sign in to view settings.</p></div>;
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Link href="/" passHref>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <CardTitle className="text-2xl font-headline text-center flex-grow">Profile Settings</CardTitle>
            <div className="w-8"></div> {/* Spacer to balance the back button */}
          </div>
          <CardDescription className="text-center pt-2">
            Manage your MetalChat display name and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-semibold">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-input focus-visible:ring-accent"
            />
             <p className="text-xs text-muted-foreground">This name is specific to MetalChat and can differ from your Clerk profile.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhoto" className="font-semibold">Profile Photo (Local Preview)</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" layout="fill" objectFit="cover" unoptimized={photoPreview.startsWith('data:') || photoPreview.startsWith('blob:') || photoPreview.includes('img.clerk.com')}/>
                ) : (
                  <UserCircle className="h-12 w-12 text-muted-foreground" />
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                    onClick={() => document.getElementById('profilePhotoInput')?.click()}
                    title="Change photo (local preview)"
                    >
                    <Camera className="h-6 w-6 text-white"/>
                </Button>
              </div>
               <Input 
                id="profilePhotoInput" 
                type="file" 
                accept="image/png, image/jpeg, image/webp, image/gif" 
                className="hidden" 
                onChange={handlePhotoChange} 
                />
              <Button variant="outline" onClick={() => document.getElementById('profilePhotoInput')?.click()}>
                Choose Image
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Changing photo here updates local preview. Actual Clerk profile image update not yet implemented via this page.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveProfile} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
