"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useNotifications } from "./notification-context";

export default function AuthListener() {
  const { refreshNotificationCount } = useNotifications();
  const supabase = createClient();

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // When a user signs in, refresh the notification count
      if (event === 'SIGNED_IN' && session) {
        refreshNotificationCount();
      }
    });

    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [refreshNotificationCount]);

  return null; // This component doesn't render anything
}