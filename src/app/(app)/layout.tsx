'use client';

import Link from 'next/link';
import {
  Home,
  MessageSquare,
  Users,
  Settings,
  Bot,
  LogOut,
  PanelLeft,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/user-button';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  avatarUrl: string;
  active?: boolean;
  unreadCount?: number;
}

function ChatListItem({ id, name, lastMessage, avatarUrl, active, unreadCount }: ChatListItemProps) {
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  return (
    <Link href={`/chat/${id}`} passHref>
      <Button
        variant={active ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start h-auto py-3 px-2 text-left transition-all duration-200 ease-in-out",
          "hover:bg-sidebar-accent",
          active && "bg-sidebar-accent",
          isCollapsed ? "items-center justify-center" : "items-center"
        )}
        aria-current={active ? "page" : undefined}
      >
        <Image
          src={avatarUrl}
          alt={name}
          width={isCollapsed ? 32 : 40}
          height={isCollapsed ? 32 : 40}
          className="rounded-full shrink-0"
          data-ai-hint="avatar person"
        />
        {!isCollapsed && (
          <div className="ml-3 overflow-hidden flex-grow">
            <p className="font-semibold text-sm truncate text-sidebar-foreground">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{lastMessage}</p>
          </div>
        )}
        {!isCollapsed && unreadCount && unreadCount > 0 && (
          <span className="ml-auto text-xs bg-accent text-accent-foreground font-bold rounded-full px-2 py-0.5">
            {unreadCount}
          </span>
        )}
      </Button>
    </Link>
  );
}

const mockChats: ChatListItemProps[] = [
  { id: '1', name: 'Alice Wonderland', lastMessage: 'Hey, how are you?', avatarUrl: 'https://placehold.co/40x40.png', active: true, unreadCount: 2 },
  { id: '2', name: 'Bob The Builder', lastMessage: 'Project update: Almost done!', avatarUrl: 'https://placehold.co/40x40.png', unreadCount: 0 },
  { id: '3', name: 'Charlie Chaplin', lastMessage: 'Funny video attached 🤣', avatarUrl: 'https://placehold.co/40x40.png' },
  { id: '4', name: 'Diana Prince', lastMessage: 'Meeting at 3 PM.', avatarUrl: 'https://placehold.co/40x40.png', unreadCount: 5 },
];

function AppSidebar() {
  const pathname = usePathname();
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  const navItems = [
    { href: '/chat', icon: MessageSquare, label: 'Chats', section: 'main' },
    { href: '/profile', icon: Settings, label: 'Profile', section: 'user' },
  ];

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className={cn("p-3 items-center", isCollapsed ? 'justify-center' : 'justify-between')}>
        {!isCollapsed && (
          <Link href="/chat" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-accent">
              <path d="M14.5 16.5L12 22l-3-5.5L9.5 16.5M12 2L3 7v10l9 5 9-5V7L12 2zM3 7l9 5 9-5M3 17l9-5 9 5M12 12.5V22" />
              <path d="M12 2L6 5l6 3 6-3-6-3z" />
            </svg>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-400 to-pink-500">
              MetalChat
            </h1>
          </Link>
        )}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <PanelLeft />
        </Button>
      </SidebarHeader>
      <Separator className="bg-sidebar-border" />

      <SidebarContent className="p-0">
        <ScrollArea className={cn("h-full", isCollapsed ? "w-[calc(var(--sidebar-width-icon)_-_1px)]" : "w-[calc(var(--sidebar-width)_-_1px)]")}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-2">
              {mockChats.map(chat => (
                <TooltipProvider key={chat.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={`/chat/${chat.id}`} passHref>
                        <Button variant={pathname.startsWith(`/chat/${chat.id}`) ? "secondary" : "ghost"} size="icon" className="rounded-lg">
                          <Image src={chat.avatarUrl} alt={chat.name} width={24} height={24} className="rounded-full" data-ai-hint="avatar person" />
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground">
                      <p>{chat.name}</p>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <span className="ml-2 text-xs bg-accent text-accent-foreground font-bold rounded-full px-1.5 py-0.5">
                          {chat.unreadCount}
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          ) : (
            <div className="p-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Conversations</h2>
              <div className="flex flex-col gap-1">
                {mockChats.map(chat => (
                  <ChatListItem key={chat.id} {...chat} active={pathname.startsWith(`/chat/${chat.id}`)} />
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </SidebarContent>

      <Separator className="bg-sidebar-border" />
      <SidebarFooter className={cn("p-3 mt-auto", isCollapsed ? "items-center" : "")}>
        <SidebarMenu>
          {navItems.filter(item => item.section === 'user').map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  tooltip={isCollapsed ? item.label : undefined}
                  isActive={pathname.startsWith(item.href)}
                  className={cn(isCollapsed && "justify-center")}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem className={cn(isCollapsed && "justify-center w-full flex")}>
            <div className={cn(isCollapsed ? "mx-auto" : "")}><UserButton /></div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
