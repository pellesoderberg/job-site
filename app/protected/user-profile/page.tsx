"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function UserProfilePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          router.push("/sign-in");
          return;
        }

        // Get the user ID from the URL query parameters
        const userId = searchParams.get('id');
        
        if (!userId) {
          setError("User ID not found in URL parameters");
          setLoading(false);
          return;
        }

        // Fetch user data from the 'profiles' table
        const { data, error } = await supabase
          .from('profiles')
          .select('username, user_description, email_name, municipality, avatar_url')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error("Error fetching user data:", error);
          setError("Could not find the requested user profile");
          setLoading(false);
          return;
        }

        setUserData(data);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [searchParams]);

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading profile...</div>;
  }

  if (error || !userData) {
    return (
      <div className="flex-1 w-full flex flex-col items-center">
        <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="mb-6">{error || "User profile not found"}</p>
          <Link href="/">
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const displayName = userData?.username || userData?.email_name || "User";
  const presentation = userData?.user_description || "No presentation available";

  return (
    <div className="flex-1 w-full flex flex-col items-center py-8">
      <div className="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md">
        <div className="mb-6">
          <Link href="/" className="text-blue-500 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Tillbaka till startsidan
          </Link>
        </div>
        
        {/* Profile header with avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 overflow-hidden">
            {userData?.avatar_url ? (
              <img 
                src={userData.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {userData?.municipality && (
            <p className="text-sm text-gray-500 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="14" 
                height="14" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="mr-1"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {userData.municipality}
            </p>
          )}
        </div>
        
        {/* Profile sections */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-medium mb-4">Om mig</h2>
          <p className="text-gray-700">{presentation}</p>
        </div>
      </div>
    </div>
  );
}