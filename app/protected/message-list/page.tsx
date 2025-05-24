"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Application {
  id: string;
  ad_id: number;
  applicant_id: string;
  poster_id: string;
  status: string;
  ad_title: string;
  applicant_username: string;
  poster_username: string;
  created_at: string; // Added created_at field
  last_message?: {
    content: string;
    created_at: string;
    sender_username: string;
  };
  unread_count: number;
  last_message_at?: string;
}

export default function MessageListPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push("/sign-in");
          return;
        }

        setCurrentUser(user);

        // Fetch all applications where the user is either the applicant or the poster
        // and the status is 'accepted' OR 'pending' (for new applications)
        const { data: appData, error: appError } = await supabase
          .from('job_applications')
          .select(`
            id, 
            ad_id, 
            applicant_id, 
            poster_id, 
            status,
            created_at,
            user_ads!job_applications_ad_id_fkey(title),
            applicant:profiles!job_applications_applicant_id_fkey(username),
            poster:profiles!job_applications_poster_id_fkey(username)
          `)
          .or(`applicant_id.eq.${user.id},poster_id.eq.${user.id}`)
          .in('status', ['accepted', 'pending']);
          
        if (appError) {
          throw appError;
        }
        
        // Format application data and fetch last message for each application
        const formattedApps = await Promise.all(appData.map(async (app) => {
          // Format application data
          const formattedApp: Application = {
            id: app.id,
            ad_id: app.ad_id,
            applicant_id: app.applicant_id,
            poster_id: app.poster_id,
            status: app.status,
            created_at: app.created_at,
            ad_title: app.user_ads.title,
            applicant_username: app.applicant?.username || 'Unknown User',
            poster_username: app.poster?.username || 'Unknown User',
            unread_count: 0
          };
          
          // Fetch the last message for this application
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select(`
              content, 
              created_at,
              sender_id,
              profiles!messages_sender_id_fkey(username)
            `)
            .eq('application_id', app.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (!lastMessageError && lastMessageData && lastMessageData.length > 0) {
            formattedApp.last_message = {
              content: lastMessageData[0].content,
              created_at: lastMessageData[0].created_at,
              sender_username: lastMessageData[0].profiles.username || 'Unknown User'
            };
            formattedApp.last_message_at = lastMessageData[0].created_at;
          }
          
          // Count unread messages where user is the receiver
          const { data: unreadMessages, error: unreadError } = await supabase
            .from('messages')
            .select('id')
            .eq('application_id', app.id)
            .eq('receiver_id', user.id)
            .eq('read_status', false);
            
          if (!unreadError && unreadMessages) {
            formattedApp.unread_count = unreadMessages.length;
          }
          
          return formattedApp;
        }));
        
        // Separate pending and accepted applications
        const pendingApps = formattedApps.filter(app => app.status === 'pending');
        const acceptedApps = formattedApps.filter(app => app.status === 'accepted');
        
        // Sort pending applications by created_at (newest first)
        pendingApps.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        // Sort accepted applications by last message date (most recent first)
        acceptedApps.sort((a, b) => {
          if (!a.last_message_at && !b.last_message_at) return 0;
          if (!a.last_message_at) return 1;
          if (!b.last_message_at) return -1;
          return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
        });
        
        // Combine arrays with pending applications first
        const sortedApps = [...pendingApps, ...acceptedApps];
        
        setApplications(sortedApps);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading conversations...</div>;
  }

  if (error) {
    return (
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="mb-6">{error}</p>
          <Link href="/">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8 bg-gray-100">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-blue-700">Your Conversations</h1>
        
        {applications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>You don't have any active conversations.</p>
            <p className="mt-2">When you apply for jobs or accept applications, your conversations will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => {
              const otherPersonName = currentUser.id === app.applicant_id 
                ? app.poster_username 
                : app.applicant_username;
                
              return (
                <Link 
                  key={app.id} 
                  href={app.status === 'pending' && app.poster_id === currentUser.id
                    ? `/protected/applications?application=${app.id}`
                    : `/protected/messages?application=${app.id}`}
                  className="block"
                >
                  <div className={`border rounded-lg p-4 hover:bg-blue-50 transition-colors ${app.unread_count > 0 ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`font-medium ${app.unread_count > 0 ? 'text-blue-800 font-bold' : 'text-blue-800'}`}>{otherPersonName}</h3>
                        <p className="text-sm text-gray-600">Re: {app.ad_title}</p>
                        {app.status === 'pending' && (
                          <span className="inline-block mt-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            {app.poster_id === currentUser.id ? 'New application' : 'Pending'}
                          </span>
                        )}
                      </div>
                      {app.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {app.unread_count}
                        </span>
                      )}
                    </div>
                    
                    {app.last_message ? (
                      <div className="mt-2">
                        <p className={`text-sm truncate ${app.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-800'}`}>
                          <span className="font-medium text-blue-700">{app.last_message.sender_username}: </span>
                          {app.last_message.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(app.last_message.created_at).toLocaleString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        No messages yet
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}