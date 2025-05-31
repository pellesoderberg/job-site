"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { useNotifications } from "./notification-context";
import { signOutAction } from "@/app/actions";
import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface HeaderAuthClientProps {
  user: any;
  avatarUrl: string | null;
}

export default function HeaderAuthClient({ user, avatarUrl }: HeaderAuthClientProps) {
  const { notificationCount, refreshNotificationCount } = useNotifications();
  const supabase = createClient();

  // Listen for auth state changes and refresh notifications when user logs in
  useEffect(() => {
    if (user) {
      // Refresh notifications immediately when component mounts with a user
      refreshNotificationCount();
      
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          refreshNotificationCount();
        }
      });

      // Clean up subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, refreshNotificationCount]);

  return user ? (
    <div className="flex items-center gap-4">
      <Link href="/protected/create-ad">
        <Button className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Lägg in annons
        </Button>
      </Link>
      <Link href="/protected/message-list" className="flex items-center hover:opacity-80 transition-opacity relative">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        {notificationCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {notificationCount}
          </div>
        )}
      </Link>
      <Link href="/protected/user" className="flex items-center hover:opacity-80 transition-opacity">
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 overflow-hidden">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          )}
        </div>
      </Link>
      <form action={signOutAction}>
        <Button type="submit" variant={"outline"}>
          Sign out
        </Button>
      </form>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}