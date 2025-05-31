"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/components/notification-context";

interface Application {
  id: string;
  ad_id: number;
  applicant_id: string;
  poster_id: string;
  status: string;
  ad_title: string;
  applicant_username: string;
  poster_username: string;
  created_at: string;
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
  
  const { decrementNotificationCount } = useNotifications();
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
        // For posters: Include accepted and pending applications only (exclude rejected)
        // For applicants: Include accepted, pending, and rejected applications
        let statusFilter;
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
            applicant:profiles!job_applications_applicant_id_fkey(username, email_name),
            poster:profiles!job_applications_poster_id_fkey(username, email_name)
          `)
          .or(`applicant_id.eq.${user.id},poster_id.eq.${user.id}`)
          .or(`and(poster_id.eq.${user.id},status.in.(accepted,pending)),and(applicant_id.eq.${user.id},status.in.(accepted,pending,rejected))`);
          
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
            applicant_username: app.applicant?.username || app.applicant?.email_name || 'Unknown User',
            poster_username: app.poster?.username || app.poster?.email_name || 'Unknown User',
            unread_count: 0
          };
          
          // Fetch the last message for this application
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select(`
              content, 
              created_at,
              sender_id,
              profiles!messages_sender_id_fkey(username, email_name)
            `)
            .eq('application_id', app.id)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (!lastMessageError && lastMessageData && lastMessageData.length > 0) {
            const lastMsg = lastMessageData[0];
            formattedApp.last_message = {
              content: lastMsg.content,
              created_at: lastMsg.created_at,
              sender_username: lastMsg.profiles?.username || lastMsg.profiles?.email_name || 'Unknown User'
            };
            formattedApp.last_message_at = lastMsg.created_at;
          }
          
          // Count unread messages for this application where current user is receiver
          const { data: unreadData, error: unreadError } = await supabase
            .from('messages')
            .select('id')
            .eq('application_id', app.id)
            .eq('receiver_id', user.id)
            .eq('read_status', false);
            
          if (!unreadError && unreadData) {
            formattedApp.unread_count = unreadData.length;
          }
          
          return formattedApp;
        }));
        
        // Sort by last message time, then by created time
        const sortedApps = formattedApps.sort((a, b) => {
          const aTime = a.last_message_at || a.created_at;
          const bTime = b.last_message_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        
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

  const handleMarkAsRead = async (applicationId: string) => {
    // Mark rejected application as "read" by updating its status to something like "rejected_read"
    // or add a separate field to track if the rejection has been acknowledged
    try {
      // First, update the application status
      const { error } = await supabase
        .from('job_applications')
        .update({ status: 'rejected_read' })
        .eq('id', applicationId)
        .eq('status', 'rejected');
        
      if (error) throw error;
      
      // Then, find and mark any system messages for this application as read
      // where the current user is the receiver
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .update({ read_status: true })
          .eq('application_id', applicationId)
          .eq('receiver_id', user.id)
          .eq('is_system_message', true)
          .eq('for_applicant_only', true)
          .eq('read_status', false);
          
        if (msgError) throw msgError;
      }
      
      // Update local state
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      // Decrement notification count
      decrementNotificationCount(1);
    } catch (error) {
      console.error('Error marking rejection as read:', error);
    }
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Laddar meddelanden...</div>;
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8">
      <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Tillbaka till startsidan
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Meddelanden</h1>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {applications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            Inga konversationer tillgängliga.
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => {
              const otherPersonName = currentUser?.id === app.applicant_id 
                ? app.poster_username 
                : app.applicant_username;
              
              const isRejected = app.status === 'rejected';
              const isApplicant = currentUser?.id === app.applicant_id;
              const isPoster = currentUser?.id === app.poster_id;
              const isPending = app.status === 'pending';
              
              return (
                <div key={app.id} className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                  isRejected && isApplicant ? 'border-red-200 bg-red-50' : 'hover:bg-gray-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-800">
                          {otherPersonName}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          app.status === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : app.status === 'rejected' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {app.status === 'accepted' ? 'Accepterad' : 
                           app.status === 'rejected' ? 'Avvisad' : 'Pågående'}
                        </div>
                        {app.unread_count > 0 && (
                          <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {app.unread_count}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Angående: {app.ad_title}
                      </p>
                      {app.last_message && (
                        <div className="text-sm text-gray-500">
                          <span className="font-medium">{app.last_message.sender_username}:</span> {app.last_message.content.substring(0, 100)}{app.last_message.content.length > 100 ? '...' : ''}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {app.last_message 
                          ? new Date(app.last_message.created_at).toLocaleDateString()
                          : new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {isRejected && isApplicant ? (
                        <button
                          onClick={() => handleMarkAsRead(app.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                        >
                          Markera som läst
                        </button>
                      ) : app.status === 'accepted' ? (
                        <Link href={`/protected/messages?application=${app.id}`}>
                          <button className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm">
                            Visa meddelanden
                          </button>
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">Väntar på svar</span>
                      )}
                      {isPoster && isPending && (
                        <Link href={`/protected/applications?application=${app.id}`}>
                          <button className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">
                            Granska
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}