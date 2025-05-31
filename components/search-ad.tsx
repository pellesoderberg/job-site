"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { useSearch } from "./search-context";
import { useRouter } from "next/navigation";

interface LocationItem {
  type: 'region' | 'municipality';
  name: string;
  parentRegion?: string;
}

export default function SearchAd() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationItem>({ type: 'region', name: "Hela sverige" });
  const [locationFilter, setLocationFilter] = useState("");
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedRegions, setExpandedRegions] = useState<string[]>([]);
  const { setSearchResults, setSearchAttempted } = useSearch(); // Get setSearchAttempted
  const supabase = createClient();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    }
    
    checkAuth();
    fetchLocations();
  }, [supabase]); // Added supabase to dependency array as it's used in checkAuth & fetchLocations

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  async function fetchLocations() {
    try {
      const { data: regionsData, error: regionsError } = await supabase
        .from('user_ads')
        .select('region')
        .not('region', 'is', null)
        .order('region');
      
      if (regionsError) {
        console.error("Error fetching regions:", regionsError);
        return;
      }

      const { data: municipalitiesData, error: municipalitiesError } = await supabase
        .from('user_ads')
        .select('municipality, region')
        .not('municipality', 'is', null)
        .order('municipality');
      
      if (municipalitiesError) {
        console.error("Error fetching municipalities:", municipalitiesError);
        return;
      }
      
      const distinctRegions = [...new Set(regionsData?.map(ad => ad.region).filter(Boolean) || [])];
      
      const locationItems: LocationItem[] = [
        { type: 'region', name: "Hela sverige" },
        ...distinctRegions.map(region => ({ type: 'region' as const, name: region })),
      ];
      
      municipalitiesData?.forEach(item => {
        if (item.municipality && item.region) {
          locationItems.push({
            type: 'municipality',
            name: item.municipality,
            parentRegion: item.region
          });
        }
      });
      
      const uniqueLocations = locationItems.filter((location, index, self) => {
        return index === self.findIndex(l => 
          l.type === location.type && 
          l.name === location.name && 
          l.parentRegion === location.parentRegion
        );
      });
      
      setLocations(uniqueLocations);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  }

  const toggleRegionExpanded = (region: string) => {
    setExpandedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region) 
        : [...prev, region]
    );
  };

  const handleSearch = async () => {
    if (!isAuthenticated) {
      router.push('/sign-in');
      return;
    }
    
    let query = supabase
      .from('user_ads')
      .select(); // Consider selecting specific columns: '*, poster_category' if needed for UserAd type
    
    if (selectedLocation.name !== "Hela sverige") {
      if (selectedLocation.type === 'region') {
        query = query.eq('region', selectedLocation.name);
      } else if (selectedLocation.type === 'municipality') {
        query = query.ilike('municipality', selectedLocation.name);
      }
    }
    
    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,region.ilike.%${searchQuery}%,municipality.ilike.%${searchQuery}%`);
    }
    
    query = query.order("created_at", { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error searching ads:", error);
      setSearchResults([]); // Set to empty array on error
    } else {
      setSearchResults(data || []);
    }
    setSearchAttempted(true); // Indicate that a search has been performed
  };

  const filteredLocations = locations.filter(location => {
    const searchLower = locationFilter.toLowerCase();
    return location.name.toLowerCase().includes(searchLower) || 
           (location.parentRegion && location.parentRegion.toLowerCase().includes(searchLower));
  });

  const matchingMunicipalities = filteredLocations.filter(loc => 
    loc.type === 'municipality' && loc.name.toLowerCase().includes(locationFilter.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto mb-8">
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Sök</h2>
          <Input
            type="text"
            placeholder="Vad vill du söka efter?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-bold mb-4">Välj plats</h2>
          <div className="relative" ref={dropdownRef}>
            <Input
              type="text"
              value={selectedLocation.name === "Hela sverige" && selectedLocation.type === "region" ? "Hela Sverige" : selectedLocation.name}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              readOnly
              className="w-full cursor-pointer"
            />
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                <div className="p-2 border-b">
                  <Input
                    type="text"
                    placeholder="Sök plats..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing
                    className="w-full"
                  />
                </div>
                <div>
                  {locationFilter && matchingMunicipalities.map((municipality, index) => (
                    <div 
                      key={`direct-municipality-${index}`}
                      className={`p-2 hover:bg-gray-100 cursor-pointer text-gray-800 border-b border-gray-100 ${municipality.name === selectedLocation.name && municipality.type === selectedLocation.type ? 'bg-blue-50' : ''}`}
                      onClick={() => {
                        setSelectedLocation(municipality);
                        setIsDropdownOpen(false);
                        setLocationFilter(""); // Clear filter on selection
                      }}
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path><circle cx="12" cy="10" r="1"></circle></svg>
                        {municipality.name}
                        <span className="text-gray-500 text-sm ml-2">({municipality.parentRegion})</span>
                      </span>
                    </div>
                  ))}
                  
                  {filteredLocations
                    .filter(location => location.type === 'region')
                    .map((region, index) => {
                      const municipalities = filteredLocations.filter(
                        loc => loc.type === 'municipality' && loc.parentRegion === region.name
                      );
                      
                      const hasChildren = municipalities.length > 0;
                      const isExpanded = expandedRegions.includes(region.name);
                      
                      return (
                        <div key={`region-${index}`}>
                          <div 
                            className={`p-2 hover:bg-gray-100 cursor-pointer text-gray-800 flex justify-between items-center ${region.name === selectedLocation.name && region.type === selectedLocation.type ? 'bg-blue-50' : ''}`}
                            // REMOVED onMouseEnter from here
                            onClick={() => { // This click selects the region
                              setSelectedLocation(region);
                              setIsDropdownOpen(false);
                              setLocationFilter(""); // Clear filter on selection
                            }}
                          >
                            <div className="flex-grow">
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                {region.name}
                              </span>
                            </div>
                            {hasChildren && (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className={`transition-transform transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} // Ensure rotate-0 for non-expanded
                                onClick={(e) => { // This click is on the arrow and toggles
                                  e.stopPropagation(); // Prevent parent div's onClick
                                  toggleRegionExpanded(region.name);
                                }}
                              >
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            )}
                          </div>
                          
                          {isExpanded && municipalities.map((municipality, mIndex) => (
                            <div 
                              key={`municipality-${mIndex}`}
                              className={`p-2 pl-6 hover:bg-gray-100 cursor-pointer text-gray-800 ${municipality.name === selectedLocation.name && municipality.type === selectedLocation.type ? 'bg-blue-50' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent region's onClick if nested
                                setSelectedLocation(municipality);
                                setIsDropdownOpen(false);
                                setLocationFilter(""); // Clear filter on selection
                              }}
                            >
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"></path><circle cx="12" cy="10" r="1"></circle></svg>
                                {municipality.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Button 
        onClick={handleSearch}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        {isAuthenticated ? "Hitta annonser" : "Logga in för att söka"} 
      </Button>
    </div>
  );
}