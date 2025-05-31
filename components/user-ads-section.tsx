"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearch } from "./search-context"; // Ensure this path is correct

interface UserAd {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string; // This might be general location text, region/municipality are more specific
  created_at: string;
  region: string;
  municipality: string | null;
  poster_category?: string;
}

export default function UserAdsSection() {
  const [userAds, setUserAds] = useState<UserAd[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true for initial fetch
  const [displayCount, setDisplayCount] = useState(5);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { searchResults, searchAttempted } = useSearch(); // Get searchAttempted

  // This function fetches all ads, typically for the initial view
  async function fetchUserAds() {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Error fetching user auth state:", authError);
        // Potentially handle auth error, e.g., by setting isAuthenticated to false
      }
      setIsAuthenticated(!!authData.user);

      const { data, error } = await supabase
        .from('user_ads')
        .select('*, poster_category') // Ensure poster_category is selected if needed
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user ads:", error);
        setUserAds([]); // Set to empty on error
      } else {
        setUserAds(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch user ads:", error);
      setUserAds([]); // Set to empty on error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // This effect now determines whether to show all ads or search results
    if (searchAttempted) {
      setLoading(true); // Indicate loading while updating to search results
      setUserAds(searchResults);
      setDisplayCount(5); // Reset display count for new search results
      setLoading(false);
    } else {
      // If no search has been attempted (initial load or search reset), fetch all ads.
      fetchUserAds();
    }
    // Adding supabase to dependencies because fetchUserAds uses it.
    // searchResults is a direct dependency for the searchAttempted=true path.
  }, [searchAttempted, searchResults, supabase]); // Added supabase

  const handleShowMore = () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    setDisplayCount(userAds.length);
  };

  if (loading) {
    return <div className="text-center py-10">Laddar annonser...</div>;
  }

  const displayedAds = userAds.slice(0, displayCount);
  const hasMoreAds = userAds.length > displayCount;

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6">Senaste annonser</h2>
      {/* Show message if search was attempted and no results, or if initial load yields no ads */}
      {displayedAds.length === 0 && (
        <div className="text-center py-10">
          {searchAttempted ? "Tyvärr, inga annonser matchade din sökning." : "Inga annonser hittades."}
        </div>
      )}
      
      {displayedAds.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-1">
          {displayedAds.map((ad) => (
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
                        {ad.category} 
                        <span className="inline-flex items-center ml-2"> {/* Added ml-2 for spacing */}
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
                            className="mr-1" // Keep mr-1 for icon spacing from text
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {ad.municipality ? ad.municipality : ad.region}
                        </span>
                        {ad.poster_category && (
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded">
                            {ad.poster_category === 'private' ? 'Privat' : 'Företag'}
                          </span>
                        )}
                      </p>
                      <p className="mt-2">{ad.description.substring(0,150)}{ad.description.length > 150 ? "..." : ""}</p> {/* Example: Truncate description */}
                    </div>
                    <div className="text-xl font-bold whitespace-nowrap"> {/* Added whitespace-nowrap */}
                      {ad.price ? `${ad.price} kr` : ""}
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    {new Date(ad.created_at).toLocaleDateString('sv-SE')} {/* Swedish date format */}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      
      {hasMoreAds && (
        <div className="flex justify-center mt-8">
          <button 
            onClick={handleShowMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {isAuthenticated ? "Visa fler" : "Logga in för att se fler"}
          </button>
        </div>
      )}
    </div>
  );
}