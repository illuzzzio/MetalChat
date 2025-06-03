
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
import Image from 'next/image'; // For placeholder image

const LOCAL_STORAGE_PROFILE_KEY = "metalChatUserProfile";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null); // For future use
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); // For future use
  const { toast } = useToast();

  useEffect(() => {
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (storedProfile) {
      const profile: UserProfile = JSON.parse(storedProfile);
      setDisplayName(profile.displayName);
      // Set photoPreview if profile.photoURL exists and is implemented
    }
  }, []);

  const handleSaveProfile = () => {
    if (!displayName.trim()) {
      toast({
        title: 'Error',
        description: 'Display name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const updatedProfile: UserProfile = {
      displayName: displayName.trim(),
      // photoURL: photoPreview || undefined, // When image upload is implemented
    };

    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updatedProfile));
    toast({
      title: 'Profile Updated',
      description: 'Your display name has been saved.',
    });
    // Potentially trigger a global state update or event if other components need to react immediately
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for actual photo upload logic
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Image Selected (Preview)", description: "Image upload not fully implemented yet."});
    }
  };

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
            <div className="w-8"></div> {/* Spacer */}
          </div>
          <CardDescription className="text-center">
            Manage your display name and profile picture.
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhoto" className="font-semibold">Profile Photo (Coming Soon)</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" layout="fill" objectFit="cover" />
                ) : (
                  <UserCircle className="h-12 w-12 text-muted-foreground" />
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                    onClick={() => document.getElementById('profilePhotoInput')?.click()}
                    title="Change photo (coming soon)"
                    disabled // Disabled for now
                    >
                    <Camera className="h-6 w-6 text-white"/>
                </Button>
              </div>
               <Input 
                id="profilePhotoInput" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handlePhotoChange} 
                disabled // Disabled for now
                />
              <Button variant="outline" onClick={() => document.getElementById('profilePhotoInput')?.click()} disabled>
                Upload Image
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Feature to upload and save profile photos is coming soon.</p>
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
