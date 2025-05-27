'use client';
import { UserButton as ClerkUserButton } from '@clerk/nextjs';

export function UserButton() {
  return (
    <ClerkUserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'w-10 h-10 border-2 border-accent rounded-full',
          userButtonPopoverCard: 'bg-card border-border shadow-xl',
          userButtonPopoverActionButton: 'text-foreground hover:bg-secondary',
          userButtonPopoverActionButtonIcon: 'text-accent',
          userButtonPopoverFooter: 'hidden' // Example of hiding footer
        },
      }}
    />
  );
}
