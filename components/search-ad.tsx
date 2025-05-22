"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSearch } from "./search-context";
import { useRouter } from "next/navigation";

export default function SearchAd() {
  const [searchQuery, setSearchQuery] = useState("");
  const { setSearchResults } = useSearch();
  const supabase = createClient();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status when component mounts
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    }
    
    checkAuth();
  }, []);

  const handleSearch = async () => {
    // If user is not authenticated, redirect to sign-in page
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    if (!searchQuery.trim()) {
      // If search is empty, fetch all ads
      const { data, error } = await supabase
        .from('user_ads')
        .select()
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching ads:", error);
        return;
      }
      
      setSearchResults(data || []);
      return;
    }

    // Search for ads that match the query in title or description
    const { data, error } = await supabase
      .from('user_ads')
      .select()
      .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error searching ads:", error);
      return;
    }
    
    setSearchResults(data || []);
  };

  return (
    <div className="w-full max-w-6xl mx-auto mb-8">
      <h2 className="text-2xl font-bold mb-4">Sök</h2>
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder="Vad vill du söka efter"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <Button 
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {isAuthenticated ? "Hitta annonser" : "Sign in to search"}
        </Button>
      </div>
    </div>
  );
}