
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
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null); 
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); 
  const { toast } = useToast();

  useEffect(() => {
    const storedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (storedProfile) {
      try {
        const profile: UserProfile = JSON.parse(storedProfile);
        setDisplayName(profile.displayName);
        if (profile.photoURL) {
             // In a real app, this might be a URL to an uploaded image.
             // For now, if it's a data URI from local selection, it could be set.
            setPhotoPreview(profile.photoURL);
        }
      } catch (e) {
        console.error("Failed to parse profile from localStorage", e);
        // Handle error or clear corrupted data
        localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
      }
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
      // If photoPreview is a data URI from a new selection, save it.
      // If it's an existing URL, it's already set.
      // Actual image upload to a server and getting a URL is needed for persistence across devices.
      photoURL: photoPreview || undefined, 
    };

    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updatedProfile));
    toast({
      title: 'Profile Updated',
      description: 'Your display name has been saved.',
    });
    // Consider window.dispatchEvent(new Event('profileUpdated')) if other components need immediate refresh.
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // Max 2MB for preview
        toast({ title: "Image Too Large", description: "Please select an image smaller than 2MB for preview.", variant: "destructive"});
        return;
      }
      setProfilePhoto(file); // Store the file object if you plan to upload it
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string); // This will be a data URI
      };
      reader.readAsDataURL(file);
      toast({ title: "Image Selected (Preview)", description: "Image upload and saving across sessions is not fully implemented yet."});
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
            <div className="w-8"></div> {/* Spacer to balance the back button */}
          </div>
          <CardDescription className="text-center pt-2">
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
            <Label htmlFor="profilePhoto" className="font-semibold">Profile Photo (Local Preview)</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" layout="fill" objectFit="cover" unoptimized={photoPreview.startsWith('data:')}/>
                ) : (
                  <UserCircle className="h-12 w-12 text-muted-foreground" />
                )}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                    onClick={() => document.getElementById('profilePhotoInput')?.click()}
                    title="Change photo"
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
            <p className="text-xs text-muted-foreground">Profile photo is stored locally for preview. Full upload feature coming soon.</p>
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
