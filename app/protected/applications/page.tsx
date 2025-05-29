"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useNotifications } from "@/components/notification-context";

interface Application {
  id: string;
  ad_id: number;
  applicant_id: string;
  poster_id: string;
  status: string;
  created_at: string;
  ad_title: string;
  applicant_username: string;
  initial_message?: string; // Added field for initial message
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adTitle, setAdTitle] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const adId = searchParams.get('ad');
  const applicationId = searchParams.get('application');
  
  useEffect(() => {
    async function fetchApplications() {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push("/sign-in");
          return;
        }
  
        let query = supabase
          .from('job_applications')
          .select(`
            id, 
            ad_id, 
            applicant_id, 
            poster_id, 
            status, 
            created_at,
            user_ads!job_applications_ad_id_fkey(title),
            profiles!job_applications_applicant_id_fkey(username)
          `);
          
        // If applicationId is provided, filter by that specific application
        if (applicationId) {
          query = query.eq('id', applicationId);
        }
        // If adId is provided, filter by that specific ad
        else if (adId) {
          query = query.eq('ad_id', adId);
          
          // Also fetch the ad title
          const { data: adData, error: adError } = await supabase
            .from('user_ads')
            .select('title')
            .eq('id', adId)
            .single();
            
          if (!adError && adData) {
            setAdTitle(adData.title);
          }
        }
        // Otherwise, show all applications for the current user
        else {
          query = query.eq('poster_id', user.id);
        }
        
        const { data, error: applicationsError } = await query;
        
        if (applicationsError) {
          throw applicationsError;
        }
        
        // Transform the data to make it easier to work with
        const formattedApplications = data.map(app => ({
          id: app.id,
          ad_id: app.ad_id,
          applicant_id: app.applicant_id,
          poster_id: app.poster_id,
          status: app.status,
          created_at: app.created_at,
          ad_title: app.user_ads.title,
          applicant_username: app.profiles.username || 'Unknown User'
        }));
        
        // Fetch initial messages for each application
        const applicationsWithMessages = await Promise.all(
          formattedApplications.map(async (app) => {
            const { data: messageData, error: messageError } = await supabase
              .from('messages')
              .select('content')
              .eq('application_id', app.id)
              .eq('is_system_message', true)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
              
            return {
              ...app,
              initial_message: messageData?.content || ''
            };
          })
        );
        
        setApplications(applicationsWithMessages);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, [adId, applicationId]);

  const { decrementNotificationCount } = useNotifications();

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    if (processingId) return;
    
    setProcessingId(applicationId);
    
    try {
      // Update the application status
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);
        
      if (updateError) {
        throw updateError;
      }
      
      // Get application details for the message
      const { data: appData, error: appError } = await supabase
        .from('job_applications')
        .select(`
          id, 
          ad_id, 
          applicant_id, 
          poster_id,
          user_ads!job_applications_ad_id_fkey(title)
        `)
        .eq('id', applicationId)
        .single();
        
      if (appError) {
        throw appError;
      }
      
      // Create a system message to notify the applicant
      const messageContent = newStatus === 'accepted' 
        ? `Your application for "${appData.user_ads.title}" has been accepted! You can now message with the poster.`
        : `Your application for "${appData.user_ads.title}" has been rejected.`;
        
      await supabase
        .from('messages')
        .insert({
          application_id: applicationId,
          sender_id: appData.poster_id,
          receiver_id: appData.applicant_id,
          content: messageContent,
          is_system_message: true,
          for_applicant_only: true,
          read_status: false  // Add this line to explicitly set read_status to false
        });
      
      // Check if the application was pending before updating state
      const wasPending = applications.find(app => app.id === applicationId)?.status === 'pending';
      
      // Update the local state
      setApplications(prevApps => 
        prevApps.map(app => {
          if (app.id === applicationId) {
            return { ...app, status: newStatus };
          }
          return app;
        })
      );
      
      // Decrease notification count AFTER state update if it was pending
      if (wasPending) {
        decrementNotificationCount(1);
      }
    } catch (err: any) {
      console.error("Error updating application status:", err);
      setError(err.message || "Failed to update application status");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading applications...</div>;
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8">
      <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to listings
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          {adTitle ? `Applications for: ${adTitle}` : 'All Applications'}
        </h1>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {applications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No applications found.
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map(app => (
              <div key={app.id} className="border rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-800">{app.applicant_username}</h3>
                    <p className="text-sm text-gray-500">
                      Applied for: {app.ad_title}
                    </p>
                    <p className="text-sm text-gray-500">
                      Date: {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    app.status === 'accepted' 
                      ? 'bg-green-100 text-green-800' 
                      : app.status === 'rejected' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </div>
                </div>
                
                {app.initial_message && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-1">Applicant's message:</p>
                    <p className="text-sm text-gray-600">{app.initial_message}</p>
                  </div>
                )}
                
                {app.status === 'pending' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'accepted')}
                      disabled={processingId === app.id}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:bg-green-300 flex-1"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(app.id, 'rejected')}
                      disabled={processingId === app.id}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-red-300 flex-1"
                    >
                      Reject
                    </button>
                  </div>
                )}
                
                {app.status === 'accepted' && (
                  <div className="mt-4">
                    <Link href={`/protected/messages?application=${app.id}`}>
                      <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                        View Messages
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}