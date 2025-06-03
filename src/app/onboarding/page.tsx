
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/types/chat';
import { UserCircle, Camera } from 'lucide-react';
import Image from 'next/image';
import { useUser } from '@clerk/nextjs';

const LOCAL_STORAGE_PROFILE_KEY_PREFIX = "metalChatUserProfile_";
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX = "metalChatOnboardingComplete_";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load

    if (!isSignedIn) {
      router.push('/sign-in'); // Should be handled by middleware, but good fallback
      return;
    }
    
    // If user is signed in and onboarding is already marked complete, redirect to home
    const onboardingComplete = localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${user?.id}`);
    if (onboardingComplete === 'true') {
      router.push('/');
      return;
    }

    // Pre-fill with Clerk data if available
    if (user) {
      setDisplayName(user.fullName || user.username || '');
      setPhotoPreview(user.imageUrl || null);
    }
  }, [router, user, isSignedIn, isLoaded]);

  const handleCompleteOnboarding = () => {
    if (!user?.id) {
        toast({ title: "Error", description: "User session not found. Please sign in again.", variant: "destructive" });
        router.push('/sign-in');
        return;
    }

    if (!displayName.trim()) {
      toast({
        title: 'Display Name Required',
        description: 'Please enter a display name to continue.',
        variant: 'destructive',
      });
      return;
    }

    const profile: UserProfile = {
      clerkUserId: user.id,
      displayName: displayName.trim(),
      photoURL: photoPreview || undefined, // Save data URI if exists from local selection
    };

    // Store app-specific profile details with Clerk user ID suffix
    localStorage.setItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${user.id}`, JSON.stringify(profile));
    localStorage.setItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${user.id}`, 'true');
    
    toast({
      title: `Welcome to MetalChat, ${displayName.trim()}!`,
      description: 'Your profile has been set up.',
    });
    router.push('/');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 2 * 1024 * 1024) { // Max 2MB for preview
        toast({ title: "Image Too Large", description: "Please select an image smaller than 2MB for preview.", variant: "destructive"});
        return;
      }
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast({ title: "Image Selected (Preview)", description: "Profile photo is currently a local preview. Actual upload is not implemented yet."});
    }
  };


  if (!isLoaded || (isLoaded && !isSignedIn)) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading authentication...</p></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-center">Welcome to MetalChat!</CardTitle>
          <CardDescription className="text-center">
            Let's set up your MetalChat profile. This overrides your default name if you wish.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="font-semibold">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="E.g., Robo Wrangler"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-input focus-visible:ring-accent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profilePhoto" className="font-semibold">Profile Photo (Optional - Local Preview)</Label>
            <div className="flex items-center gap-4">
               <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile Preview" layout="fill" objectFit="cover" unoptimized={photoPreview.startsWith('data:') || photoPreview.startsWith('blob:') || photoPreview.includes('img.clerk.com')} />
                ) : (
                  <UserCircle className="h-12 w-12 text-muted-foreground" />
                )}
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity rounded-full"
                    onClick={() => document.getElementById('profilePhotoInput')?.click()}
                    title="Upload photo (local preview)"
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
            <p className="text-xs text-muted-foreground">Clerk profile image is used by default. This provides a local override preview. Full image upload feature coming soon.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCompleteOnboarding} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Complete Setup
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
