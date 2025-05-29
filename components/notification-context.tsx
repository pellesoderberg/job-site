"use client";

import { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface NotificationContextType {
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  decrementNotificationCount: (amount?: number) => void;
  refreshNotificationCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificationCount, setNotificationCount] = useState(0);
  const supabase = createClient();

  const decrementNotificationCount = (amount: number = 1) => {
    setNotificationCount(prev => Math.max(0, prev - amount));
  };

  const refreshNotificationCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setNotificationCount(0);
        return;
      }

      let count = 0;

      // Count pending applications where user is the poster
      const { data: pendingApps, error: pendingError } = await supabase
        .from('job_applications')
        .select('id')
        .eq('poster_id', user.id)
        .eq('status', 'pending');
        
      if (!pendingError && pendingApps) {
        count += pendingApps.length;
      }
      
      // Count unread messages where user is the receiver
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('read_status', false);
        
      if (!messagesError && unreadMessages) {
        count += unreadMessages.length;
      }

      setNotificationCount(count);
    } catch (error) {
      console.error('Error refreshing notification count:', error);
    }
  };

  // Initial load of notification count
  useEffect(() => {
    refreshNotificationCount();
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      notificationCount, 
      setNotificationCount, 
      decrementNotificationCount,
      refreshNotificationCount 
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}