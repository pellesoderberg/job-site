"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSearch } from "./search-context";
import { useRouter } from "next/navigation";

export default function SearchAd() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("Hela sverige");
  const [distinctRegions, setDistinctRegions] = useState<string[]>([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const { setSearchResults } = useSearch();
  const supabase = createClient();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const regionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication status when component mounts
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    }
    
    checkAuth();
    fetchRegions();
  }, []);

  // Add click outside listener for region dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setIsRegionDropdownOpen(false);
      }
    }

    if (isRegionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRegionDropdownOpen]);

  async function fetchRegions() {
    try {
      const { data, error } = await supabase
        .from('user_ads')
        .select('region')
        .order('region');
      
      if (error) {
        console.error("Error fetching regions:", error);
        return;
      }
      
      // Extract distinct regions
      const regions = ["Hela sverige", ...new Set(data?.map(ad => ad.region).filter(Boolean) || [])];
      setDistinctRegions(regions);
    } catch (error) {
      console.error("Failed to fetch regions:", error);
    }
  }

  const handleSearch = async () => {
    // If user is not authenticated, redirect to sign-in page
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    let query = supabase
      .from('user_ads')
      .select();
    
    // Apply region filter if not "Hela sverige"
    if (selectedRegion !== "Hela sverige") {
      query = query.eq('region', selectedRegion);
    }
    
    // Apply text search if provided
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    // Order by creation date
    query = query.order("created_at", { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error searching ads:", error);
      return;
    }
    
    setSearchResults(data || []);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-8">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Sök</h2>
          <Input
            type="text"
            placeholder="Vad vill du söka efter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Välj plats</h2>
          <div className="relative" ref={regionDropdownRef}>
            <Input
              type="text"
              value={selectedRegion}
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              readOnly
              className="w-full cursor-pointer"
            />
            {isRegionDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {distinctRegions.map((region, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                    onClick={() => {
                      setSelectedRegion(region);
                      setIsRegionDropdownOpen(false);
                    }}
                  >
                    {region}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleSearch}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        {isAuthenticated ? "Hitta annonser" : "Sign in to search"}
      </Button>
    </div>
  );
}