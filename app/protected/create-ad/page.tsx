"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Location {
  id: number;
  region: string;
  municipality?: string;
}

export default function CreateAdPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [posterCategory, setPosterCategory] = useState<'private' | 'business' | ''>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [distinctRegions, setDistinctRegions] = useState<string[]>([]);
  const [regionSearchTerm, setRegionSearchTerm] = useState("");
  const [municipalitySearchTerm, setMunicipalitySearchTerm] = useState("");
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [isMunicipalityDropdownOpen, setIsMunicipalityDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const municipalityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/sign-in");
        return;
      }
      
      setUser(user);
      setLoading(false);
    }
    
    getUser();
    fetchLocations();
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

  // Add click outside listener for municipality dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (municipalityDropdownRef.current && !municipalityDropdownRef.current.contains(event.target as Node)) {
        setIsMunicipalityDropdownOpen(false);
      }
    }

    if (isMunicipalityDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMunicipalityDropdownOpen]);

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, region, municipality')
        .order('region');
      
      if (error) {
        console.error("Error fetching locations:", error);
        return;
      }
      
      setLocations(data || []);
      
      // Extract distinct regions
      const regions = [...new Set(data?.map(location => location.region) || [])];
      setDistinctRegions(regions);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!title || !description || !region || !posterCategory) {
      setError("Titel, Beskrivning, Region och Kategori är obligatoriska fält");
      setIsSubmitting(false);
      return;
    }

    try {
      // Get the user's profile ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw new Error("Could not find user profile");
      }

      // Insert the new ad
      const { error: insertError } = await supabase
        .from('user_ads')
        .insert({
          title,
          description,
          region,
          municipality: municipality || null,
          poster_category: posterCategory,
          user_id: profileData.id,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      setRegion("");
      setMunicipality("");
      setPosterCategory('');
      
      // Redirect after successful submission
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create ad");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRegions = distinctRegions.filter(region => 
    region.toLowerCase().includes(regionSearchTerm.toLowerCase())
  );

  const filteredMunicipalities = locations
    .filter(location => location.region === region && location.municipality)
    .map(location => location.municipality as string)
    .filter((municipality, index, self) => 
      self.indexOf(municipality) === index && 
      municipality.toLowerCase().includes(municipalitySearchTerm.toLowerCase())
    );

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      {success && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center">
            <div className="mb-6 flex justify-center">
              <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Din annons har skapats!</h3>
            <p className="text-gray-600 mb-4">Du kommer att omdirigeras till startsidan...</p>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-md p-4">
        <h1 className="text-2xl font-bold mb-6">Lägg in annons</h1>
        
        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block font-medium text-gray-700 mb-2">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-md"
              placeholder="Ange titel för din annons"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block font-medium text-gray-700 mb-2">
              Beskrivning <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border rounded-md min-h-[150px]"
              placeholder="Beskriv din annons"
              required
            />
          </div>
           {/* Poster Category */}
           <div className="mb-6">
           <label htmlFor="description" className="block font-medium text-gray-700 mb-2">
              Kategori <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="posterCategory"
                  value="private"
                  checked={posterCategory === 'private'}
                  onChange={(e) => setPosterCategory(e.target.value as 'private')}
                  className="mr-2"
                />
                Privat
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="posterCategory"
                  value="business"
                  checked={posterCategory === 'business'}
                  onChange={(e) => setPosterCategory(e.target.value as 'business')}
                  className="mr-2"
                />
                Företag
              </label>
            </div>
          </div>
          <div className="relative">
            <label htmlFor="region" className="block font-medium text-gray-700 mb-2">
              Region <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={regionDropdownRef}>
              <input
                type="text"
                id="region-search"
                value={regionSearchTerm}
                onChange={(e) => {
                  setRegionSearchTerm(e.target.value);
                  setIsRegionDropdownOpen(true);
                }}
                onFocus={() => setIsRegionDropdownOpen(true)}
                className="w-full p-3 border rounded-md"
                placeholder="Sök efter region"
              />
              {region && (
                <div className="mt-2 p-2 bg-blue-100 rounded-md flex justify-between items-center text-blue-800">
                  <span>{region}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      setRegion("");
                      setRegionSearchTerm("");
                      setMunicipality(""); // Clear municipality when region changes
                      setMunicipalitySearchTerm("");
                    }}
                    className="text-red-500 hover:text-blue-700"
                  >
                    ✕
                  </button>
                </div>
              )}
              {isRegionDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredRegions.length > 0 ? (
                    filteredRegions.map((regionName, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                        onClick={() => {
                          setRegion(regionName);
                          setRegionSearchTerm("");
                          setIsRegionDropdownOpen(false);
                          setMunicipality(""); // Clear municipality when region changes
                          setMunicipalitySearchTerm("");
                        }}
                      >
                        {regionName}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-gray-500">Inga regioner hittades</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {region && (
            <div className="relative">
              <label htmlFor="municipality" className="block font-medium text-gray-700 mb-2">
                Kommun <span className="text-gray-500 text-sm">(valfritt)</span>
              </label>
              <div className="relative" ref={municipalityDropdownRef}>
                <input
                  type="text"
                  id="municipality-search"
                  value={municipalitySearchTerm}
                  onChange={(e) => {
                    setMunicipalitySearchTerm(e.target.value);
                    setIsMunicipalityDropdownOpen(true);
                  }}
                  onFocus={() => setIsMunicipalityDropdownOpen(true)}
                  className="w-full p-3 border rounded-md"
                  placeholder="Sök efter kommun"
                />
                {municipality && (
                  <div className="mt-2 p-2 bg-blue-100 rounded-md flex justify-between items-center text-blue-800">
                    <span>{municipality}</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setMunicipality("");
                        setMunicipalitySearchTerm("");
                      }}
                      className="text-red-500 hover:text-blue-700"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {isMunicipalityDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredMunicipalities.length > 0 ? (
                      filteredMunicipalities.map((municipalityName, index) => (
                        <div
                          key={index}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-gray-800"
                          onClick={() => {
                            setMunicipality(municipalityName);
                            setMunicipalitySearchTerm("");
                            setIsMunicipalityDropdownOpen(false);
                          }}
                        >
                          {municipalityName}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-gray-500">Inga kommuner hittades</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mt-2">
            <p>Fält markerade med <span className="text-red-500">*</span> är obligatoriska</p>
          </div>
          
          <div className="flex gap-4">
            <Link href="/" className="flex-1">
              <button type="button" className="w-full p-3 border rounded-md">
                Avbryt
              </button>
            </Link>
            <button
              type="submit"
              className="flex-1 p-3 bg-blue-500 text-white rounded-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Skapar annons..." : "Skapa annons"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}