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
  created_at: string;
  user_id: string;
}

export default function ViewAdPage() {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      } catch (error) {
        console.error("Failed to fetch ad:", error);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchAd();
  }, [searchParams]);

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
        
        <h1 className="text-3xl font-bold mb-2">{ad.title}</h1>
        
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
        </div>
        
        {ad.price && (
          <div className="text-2xl font-bold text-green-600 mb-6">
            {ad.price} kr
          </div>
        )}
        
        <div className="border-t border-b py-6 my-6">
          <h2 className="text-xl font-semibold mb-4">Description</h2>
          <p className="whitespace-pre-line">{ad.description}</p>
        </div>
        
        <div className="flex justify-between items-center text-sm text-gray-500">
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