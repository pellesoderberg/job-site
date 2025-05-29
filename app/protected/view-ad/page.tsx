"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

interface Ad {
  id: number;
  title: string;
  description: string;
  region: string;
  municipality: string | null;
  price: number | null;
  category: string | null;
  poster_category?: string;
  created_at: string;
  user_id: string;
}

interface ApplicationStatus {
  id?: string;
  status?: string;
  exists: boolean;
}

export default function ViewAdPage() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>({ exists: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [posterFullName, setPosterFullName] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchAd() {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push("/sign-in");
          return;
        }

        setCurrentUser(user);

        // Get the ad ID from the URL query parameters
        const adId = searchParams.get('id');
        
        if (!adId) {
          setError("Ad ID not found in URL parameters");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_ads')
          .select()
          .eq('id', adId)
          .single();

        if (error) {
          console.error("Error fetching ad:", error);
          setError("Could not find the requested ad");
          setLoading(false);
          return;
        }

        setAd(data);

        // Fetch poster's username
        const { data: posterData, error: posterError } = await supabase
          .from('profiles')
          .select('username, email_name')
          .eq('id', data.user_id)
          .single();

        if (!posterError && posterData) {
          setPosterFullName(posterData.username || posterData.email_name || 'Unknown User');
        }

        // Check if the user has already applied for this ad
        const { data: applicationData, error: applicationError } = await supabase
          .from('job_applications')
          .select('id, status')
          .eq('ad_id', adId)
          .eq('applicant_id', user.id)
          .single();

        if (applicationData) {
          setApplicationStatus({
            exists: true,
            id: applicationData.id,
            status: applicationData.status
          });
        }
      } catch (error) {
        console.error("Failed to fetch ad:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchAd();
  }, [searchParams]);

  const handleApply = async () => {
    if (!ad || !currentUser || isSubmitting) return;
    
    setIsSubmitting(true);
    setSuccessMessage(null);
    
    try {
      // Create a job application
      const { data: applicationData, error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          ad_id: ad.id,
          applicant_id: currentUser.id,
          poster_id: ad.user_id,
          status: 'pending'
        })
        .select()
        .single();

      if (applicationError) {
        throw applicationError;
      }

      // Create a system message to notify the poster
      await supabase
        .from('messages')
        .insert({
          application_id: applicationData.id,
          sender_id: currentUser.id,
          receiver_id: ad.user_id,
          content: applicationMessage || `I am interested in your ad: "${ad.title}"`,
          is_system_message: true
        });

      setApplicationStatus({
        exists: true,
        id: applicationData.id,
        status: 'pending'
      });
      
      setSuccessMessage("Your interest has been sent to the poster!");
    } catch (error: any) {
      console.error("Error applying for ad:", error);
      setError(error.message || "Failed to apply for this ad");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading ad details...</div>;
  }

  if (error || !ad) {
    return (
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="mb-6">{error || "Ad not found"}</p>
          <Link href="/">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && ad.user_id === currentUser.id;

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to listings
          </Link>
        </div>
        
        {successMessage && (
          <div className="mb-6 p-3 bg-green-100 text-green-700 rounded">
            {successMessage}
          </div>
        )}
        
        <h1 className="text-3xl font-bold mb-2 text-gray-800">{ad.title}</h1>
        
        {/* Add poster information */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Posted by: 
            {posterFullName ? (
              <Link href={`/protected/user-profile?id=${ad.user_id}`} className="text-blue-500 hover:underline ml-1">
                {posterFullName}
              </Link>
            ) : (
              <span className="ml-1">Unknown User</span>
            )}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {ad.region}
          </span>
          {ad.municipality && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              {ad.municipality}
            </span>
          )}
          {ad.category && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
              {ad.category}
            </span>
          )}
          {ad.poster_category && (
            <span className={`px-3 py-1 rounded-full text-sm ${ad.poster_category === 'private' ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-800'}`}>
              {ad.poster_category === 'private' ? 'Privatperson' : 'Företag'}
            </span>
          )}
        </div>
        
        {ad.price && (
          <div className="text-2xl font-bold text-green-600 mb-6">
            {ad.price} kr
          </div>
        )}
        
        <div className="border-t border-b py-6 my-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Description</h2>
          <p className="whitespace-pre-line text-gray-700">{ad.description}</p>
        </div>
        
        {!isOwner && (
          <div className="mt-6">
            {applicationStatus.exists ? (
              <div className="p-4 bg-gray-100 rounded-md">
                <p className="font-medium text-gray-800">
                  Application Status: <span className={`${
                    applicationStatus.status === 'pending' ? 'text-yellow-600' : 
                    applicationStatus.status === 'accepted' ? 'text-green-600' : 
                    'text-red-600'
                  }`}>
                    {applicationStatus.status?.charAt(0).toUpperCase() + applicationStatus.status?.slice(1)}
                  </span>
                </p>
                {applicationStatus.status === 'pending' && (
                  <p className="text-sm mt-2 text-gray-600">Your application is being reviewed by the poster.</p>
                )}
                {applicationStatus.status === 'accepted' && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Your application has been accepted!</p>
                    <Link href={`/protected/messages?application=${applicationStatus.id}`}>
                      <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                        View Messages
                      </button>
                    </Link>
                  </div>
                )}
                {applicationStatus.status === 'rejected' && (
                  <p className="text-sm mt-2 text-gray-600">Your application was not accepted for this position.</p>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label htmlFor="applicationMessage" className="block text-sm font-medium text-gray-700 mb-2">
                    Message to the poster (optional)
                  </label>
                  <textarea
                    id="applicationMessage"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Introduce yourself and explain why you're interested in this ad..."
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleApply}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                >
                  {isSubmitting ? "Sending..." : "I am interested"}
                </button>
              </div>
            )}
          </div>
        )}
        
        {isOwner && (
          <div className="mt-6">
            <Link href={`/protected/applications?ad=${ad.id}`}>
              <button className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                View Applications
              </button>
            </Link>
          </div>
        )}
        
        <div className="flex justify-between items-center text-sm text-gray-500 mt-6">
          <div>
            Posted: {new Date(ad.created_at).toLocaleDateString()}
          </div>
          <div>
            Ad ID: {ad.id}
          </div>
        </div>
      </div>
    </div>
  );
}