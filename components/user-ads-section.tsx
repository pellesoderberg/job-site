"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearch } from "./search-context";

interface UserAd {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  created_at: string;
  region: string;
  municipality: string | null;
  poster_category?: string;
}

export default function UserAdsSection() {
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(5);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { searchResults } = useSearch();

  useEffect(() => {
    fetchUserAds();
  }, []);

  // Update userAds when searchResults change
  useEffect(() => {
    if (searchResults.length > 0) {
      setUserAds(searchResults);
      setDisplayCount(5); // Reset display count when new search results come in
    }
  }, [searchResults]);

  async function fetchUserAds() {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);

      const { data, error } = await supabase
        .from('user_ads')
        .select()
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user ads:", error);
        return;
      }

      setUserAds(data || []);
    } catch (error) {
      console.error("Failed to fetch user ads:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleShowMore = () => {
    // If user is not authenticated, redirect to sign-in page
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    // Otherwise, show all ads
    setDisplayCount(userAds.length);
  };

  if (loading) {
    return <div className="text-center py-10">Loading ads...</div>;
  }

  // Only display the first 'displayCount' ads
  const displayedAds = userAds.slice(0, displayCount);
  const hasMoreAds = userAds.length > displayCount;

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Latest Ads</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-1">
        {displayedAds.length > 0 ? (
          displayedAds.map((ad) => (
            <div 
              key={ad.id} 
              className="border rounded-md overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link href={`/protected/view-ad?id=${ad.id}`} className="block">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{ad.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ad.category} • {ad.municipality ? ad.municipality : ad.region}
                        {ad.poster_category && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded">
                            {ad.poster_category === 'private' ? 'Privat' : 'Företag'}
                          </span>
                        )}
                      </p>
                      <p className="mt-2">{ad.description}</p>
                    </div>
                    <div className="text-xl font-bold">
                      {ad.price ? `${ad.price} kr` : ""}
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    {new Date(ad.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="text-center py-10">No ads found.</div>
        )}
      </div>
      
      {hasMoreAds && (
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleShowMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {isAuthenticated ? "Show More" : "Sign in to see more"}
          </button>
        </div>
      )}
    </div>
  );
}