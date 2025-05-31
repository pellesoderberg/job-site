"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useNotifications } from "@/components/notification-context";

// In the Message interface, add the new field
interface Message {
  id: string;
  application_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_system_message: boolean;
  for_applicant_only?: boolean;
  sender_username?: string;
  read_status?: boolean;
}

interface Application {
  id: string;
  ad_id: number;
  applicant_id: string;
  poster_id: string;
  status: string;
  ad_title: string;
  applicant_username: string;
  poster_username: string;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const { decrementNotificationCount } = useNotifications();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('application');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up real-time subscription for new messages
  // In the real-time subscription handler
  useEffect(() => {
    if (!applicationId || !currentUser || !application) return;

    const subscription = supabase
      .channel(`messages:${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `application_id=eq.${applicationId}`
        },
        async (payload) => {
          // Skip system messages marked for applicant only if the current user is the poster
          if (payload.new.is_system_message && 
              payload.new.for_applicant_only && 
              currentUser.id === application.poster_id) {
            return;
          }
          
          // Fetch the sender username
          const { data: userData } = await supabase
            .from('profiles')
            .select('username, email_name')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender_username: userData?.username || userData?.email_name || 'Unknown User'
          };
          
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [applicationId, currentUser, application]);

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

        if (!applicationId) {
          setError("Application ID not found in URL parameters");
          setLoading(false);
          return;
        }

        // Fetch application details
        const { data: appData, error: appError } = await supabase
          .from('job_applications')
          .select(`
            id, 
            ad_id, 
            applicant_id, 
            poster_id, 
            status,
            user_ads!job_applications_ad_id_fkey(title),
            applicant:profiles!job_applications_applicant_id_fkey(username, email_name),
            poster:profiles!job_applications_poster_id_fkey(username, email_name)
          `)
          .eq('id', applicationId)
          .single();
          
        if (appError) {
          throw appError;
        }
        
        // Check if user is part of this conversation
        if (user.id !== appData.applicant_id && user.id !== appData.poster_id) {
          setError("You don't have permission to view these messages");
          setLoading(false);
          return;
        }
        
        // Format application data
        const formattedApp = {
          id: appData.id,
          ad_id: appData.ad_id,
          applicant_id: appData.applicant_id,
          poster_id: appData.poster_id,
          status: appData.status,
          ad_title: appData.user_ads.title,
          applicant_username: appData.applicant?.username || appData.applicant?.email_name || 'Unknown User',
          poster_username: appData.poster?.username || appData.poster?.email_name || 'Unknown User'
        };
        
        setApplication(formattedApp);
        
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(`
            id, 
            application_id, 
            sender_id, 
            receiver_id, 
            content, 
            created_at,
            is_system_message,
            for_applicant_only,
            read_status,
            profiles!messages_sender_id_fkey(username, email_name)
          `)
          .eq('application_id', applicationId)
          .order('created_at', { ascending: true });
          
        if (messagesError) {
          throw messagesError;
        }
        
        // Add this line to set the messages in state
        const formattedMessages = messagesData
          .filter(msg => {
            // Filter out system messages marked for applicant only if the current user is the poster
            if (msg.is_system_message && 
                msg.for_applicant_only && 
                user.id === formattedApp.poster_id) {
              return false;
            }
            return true;
          })
          .map(msg => ({
            ...msg,
            sender_username: msg.profiles?.username || msg.profiles?.email_name || 'Unknown User'
          }));
        setMessages(formattedMessages);
        
        // Mark unread messages as read if the current user is the receiver
        const unreadMessages = messagesData.filter(msg => 
          msg.receiver_id === user.id && !msg.read_status
        );
        
        if (unreadMessages.length > 0) {
          const unreadIds = unreadMessages.map(msg => msg.id);
          
          // Update read_status to true for all unread messages where user is the receiver
          await supabase
            .from('messages')
            .update({ read_status: true })
            .in('id', unreadIds);
            
          // Decrease notification count by the number of messages marked as read
          decrementNotificationCount(unreadMessages.length);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [applicationId, decrementNotificationCount]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !application || !currentUser || sendingMessage) {
      return;
    }
    
    setSendingMessage(true);
    
    try {
      // Determine the receiver ID (the other person in the conversation)
      const receiverId = currentUser.id === application.applicant_id 
        ? application.poster_id 
        : application.applicant_id;
      
      // Create a temporary message object to display immediately
      const tempMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID that will be replaced
        application_id: application.id,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        content: newMessage,
        created_at: new Date().toISOString(),
        is_system_message: false,
        sender_username: 'You',
        read_status: false // New messages are unread by default
      };
      
      // Add the message to the UI immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Clear the input field
      setNewMessage("");
      
      // Insert the new message into the database
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          application_id: application.id,
          sender_id: currentUser.id,
          receiver_id: receiverId,
          content: tempMessage.content,
          is_system_message: false,
          read_status: false // New messages are unread by default
        });
        
      if (messageError) {
        throw messageError;
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
      
      // If there was an error, remove the temporary message
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading messages...</div>;
  }

  if (error || !application) {
    return (
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="mb-6">{error || "Application not found"}</p>
          <Link href="/">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
            Tillbaka till startsidan
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const otherPersonName = currentUser.id === application.applicant_id 
    ? application.poster_username 
    : application.applicant_username;

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md flex flex-col h-[80vh]">
        <div className="mb-4 border-b pb-4">
          <Link href="/" className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Tillbaka till startsidan
          </Link>
          
          <h1 className="text-2xl font-bold mt-2">
            Meddelanden med {otherPersonName}
          </h1>
          <p className="text-sm text-gray-500">
            Angående: {application.ad_title}
          </p>
        </div>
        
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id} 
                className={`${
                  msg.is_system_message 
                    ? 'bg-gray-100 text-gray-800 mx-auto max-w-[80%]' 
                    : msg.sender_id === currentUser.id
                      ? 'bg-blue-500 text-white ml-auto' 
                      : 'bg-gray-200 text-gray-800'
                } p-3 rounded-lg max-w-[70%] break-words`}
              >
                {msg.is_system_message ? (
                  <div className="text-center text-sm italic">
                    {msg.content}
                  </div>
                ) : (
                  <>
                    <div className="text-xs mb-1 font-medium">
                      {msg.sender_id === currentUser.id ? 'You' : msg.sender_username}
                    </div>
                    <div>{msg.content}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input form */}
        <form onSubmit={handleSendMessage} className="mt-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Skriv meddelande..."
              className="flex-1 p-3 border rounded-md"
              disabled={application.status !== 'accepted'}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sendingMessage || application.status !== 'accepted'}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-300"
            >
              {sendingMessage ? "Skickar..." : "Skicka"}
            </button>
          </div>
          
          {application.status !== 'accepted' && (
            <div className="mt-2 text-sm text-red-500">
              You can only send messages once the application has been accepted.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}