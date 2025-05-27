'use client';

import { UserProfile as ClerkUserProfile, useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { Bell, Shield, Palette, Info, Edit3, Save, X } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';

// Mock app-specific settings
interface AppSettings {
  notificationsEnabled: boolean;
  theme: 'dark' | 'light' | 'system'; // Assuming MetalChat might support more themes later
  bio: string;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      type: 'spring',
      stiffness: 100,
    },
  }),
  exit: { opacity: 0, y: -20 },
};


export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [appSettings, setAppSettings] = useState<AppSettings>({
    notificationsEnabled: true,
    theme: 'dark', // Default to dark as per app theme
    bio: '',
  });
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState('');

  useEffect(() => {
    // In a real app, fetch appSettings from your backend (e.g., Firestore)
    // For now, initialize bio if user data is available
    if (user?.unsafeMetadata?.bio) {
      setAppSettings(prev => ({ ...prev, bio: user.unsafeMetadata.bio as string }));
      setTempBio(user.unsafeMetadata.bio as string);
    } else if (user) {
       setTempBio("Tell us something about yourself...");
       setAppSettings(prev => ({ ...prev, bio: "Tell us something about yourself..."}));
    }
  }, [user]);

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, save this to your backend
    console.log(`Setting ${key} changed to ${value}`);
  };

  const handleSaveBio = async () => {
    // Save bio to Clerk user metadata and/or your backend
    if (user) {
      try {
        await user.update({ unsafeMetadata: { ...user.unsafeMetadata, bio: tempBio } });
        setAppSettings(prev => ({ ...prev, bio: tempBio }));
        setIsEditingBio(false);
      } catch (error) {
        console.error("Failed to update bio:", error);
      }
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size={48} />
      </div>
    );
  }


  const profileSections = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage your notification preferences.',
      content: (
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
          <Label htmlFor="notificationsEnabled" className="text-base text-foreground">
            Enable Notifications
          </Label>
          <Switch
            id="notificationsEnabled"
            checked={appSettings.notificationsEnabled}
            onCheckedChange={(checked) => handleSettingChange('notificationsEnabled', checked)}
            className="data-[state=checked]:bg-accent data-[state=unchecked]:bg-muted"
          />
        </div>
      ),
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Customize the look and feel of MetalChat.',
      content: (
         <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
          <Label htmlFor="theme" className="text-base text-foreground">
            App Theme
          </Label>
          <Input value="Dark (Default)" className="max-w-[150px] text-right bg-input border-0" readOnly disabled />
        </div>
      ),
    },
     {
      icon: Info,
      title: 'Bio',
      description: 'Tell others a bit about yourself.',
      content: (
        <div className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
          {isEditingBio ? (
            <div className="space-y-3">
              <Textarea
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                placeholder="Your bio..."
                className="min-h-[100px] bg-input border-border focus:border-accent"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setIsEditingBio(false); setTempBio(appSettings.bio); }}>
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveBio} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Save className="mr-1 h-4 w-4" /> Save Bio
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <p className="text-muted-foreground whitespace-pre-line">{appSettings.bio || 'No bio set.'}</p>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingBio(true)} className="text-accent hover:text-accent/80 -mt-1 -mr-1">
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ),
    }
  ];


  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">Profile & Settings</h1>
        <p className="text-lg text-muted-foreground mt-1">
          Manage your account details and customize your MetalChat experience.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card border-border shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2 text-foreground">
                <Shield className="text-accent h-6 w-6"/> Account Management
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Update your personal information, email, and password using Clerk.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-2 lg:p-4">
              <ClerkUserProfile
                appearance={{
                  elements: {
                    rootBox: 'w-full shadow-none',
                    card: 'w-full bg-transparent shadow-none border-none',
                    navbar: 'hidden', // Hides the Clerk profile navbar to embed cleanly
                    pageScrollBox: 'p-0',
                    profilePage__security: 'text-foreground', // Example class for specific sections
                    formButtonPrimary: 'bg-accent text-accent-foreground hover:bg-accent/90',
                    formFieldLabel: 'text-foreground',
                    formFieldInput: 'bg-input border-border text-foreground focus:ring-accent focus:border-accent',
                    accordionTriggerButton: 'text-foreground hover:bg-secondary/50',
                    accordionContent: 'text-foreground',
                    dividerLine: 'bg-border',
                    headerTitle: 'text-foreground',
                    headerSubtitle: 'text-muted-foreground',
                    modalCloseButton: 'text-foreground',
                    selectButton: 'bg-input border-border text-foreground',
                    selectOptionsContainer: 'bg-popover border-border',
                    selectOption__active: 'bg-accent text-accent-foreground',
                    selectOption: 'hover:bg-secondary/50',
                    badge: 'bg-secondary text-secondary-foreground',
                    tag: 'bg-secondary text-secondary-foreground',
                    deleteButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                  },
                }}
              >
                <ClerkUserProfile.Page label="Account" url="account" labelIcon={<Info />} />
                <ClerkUserProfile.Page label="Security" url="security" labelIcon={<Shield />} />
              </ClerkUserProfile>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-8">
           <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-foreground">App Settings</CardTitle>
              <CardDescription className="text-muted-foreground">
                Customize your MetalChat application preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AnimatePresence>
                {profileSections.map((section, index) => (
                  <motion.div
                    key={section.title}
                    custom={index}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-3"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <section.icon className="h-5 w-5 text-accent" />
                        <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8 mb-2">{section.description}</p>
                    </div>
                    {section.content}
                    {index < profileSections.length - 1 && <Separator className="my-6 bg-border/50" />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
