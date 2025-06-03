
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

const LOCAL_STORAGE_PROFILE_KEY = "metalChatUserProfile";
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY = "metalChatOnboardingComplete";

export default function OnboardingPage() {
  const [displayName, setDisplayName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null); // For future use
  const [photoPreview, setPhotoPreview] = useState<string | null>(null); // For future use
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If already onboarded, redirect to home
    if (localStorage.getItem(LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY) === 'true') {
      router.push('/');
    }
  }, [router]);

  const handleCompleteOnboarding = () => {
    if (!displayName.trim()) {
      toast({
        title: 'Display Name Required',
        description: 'Please enter a display name to continue.',
        variant: 'destructive',
      });
      return;
    }

    const profile: UserProfile = {
      displayName: displayName.trim(),
      // photoURL will be handled later
    };

    localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY, 'true');
    
    toast({
      title: 'Welcome to MetalChat!',
      description: 'Your profile has been set up.',
    });
    router.push('/');
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
          <CardTitle className="text-2xl font-headline text-center">Welcome to MetalChat!</CardTitle>
          <CardDescription className="text-center">
            Let's set up your profile so others can recognize you.
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
            <Label htmlFor="profilePhoto" className="font-semibold">Profile Photo (Optional - Coming Soon)</Label>
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
                    title="Upload photo (coming soon)"
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
                Choose Image
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Feature to upload and save profile photos is coming soon.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleCompleteOnboarding} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Get Started
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
