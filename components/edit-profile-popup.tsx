"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";

interface EditProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentDescription?: string;
  currentMunicipality?: string;
  userId: string;
}

interface Location {
  id: number;
  region: string;
  municipality?: string;
}

export default function EditProfilePopup({
  isOpen,
  onClose,
  currentName,
  currentDescription = "",
  currentMunicipality = "",
  userId,
}: EditProfilePopupProps) {
  const [name, setName] = useState(currentName || "");
  const [description, setDescription] = useState(currentDescription || "");
  const [municipality, setMunicipality] = useState(currentMunicipality || "");
  const [locations, setLocations] = useState<Location[]>([]);
  const [municipalitySearchTerm, setMunicipalitySearchTerm] = useState("");
  const [isMunicipalityDropdownOpen, setIsMunicipalityDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();
  const municipalityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

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
        .order('municipality');
      
      if (error) {
        console.error("Error fetching locations:", error);
        return;
      }
      
      setLocations(data || []);
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: name,
          user_description: description,
          municipality: municipality || null
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setSuccess(true);
      
      // Show success message for a short time then close
      setTimeout(() => {
        setSuccess(false);
        onClose();
        window.location.reload(); // Refresh to show updated data
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMunicipalities = locations
    .filter(location => location.municipality)
    .map(location => location.municipality as string)
    .filter((municipality, index, self) => 
      self.indexOf(municipality) === index && 
      municipality.toLowerCase().includes(municipalitySearchTerm.toLowerCase())
    );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Om dig</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          Din information kommer att användas av alla Vend-tjänster.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Personuppgifter</h3>
            
            {/* Name section */}
            <div className="mb-4">
              <label htmlFor="name" className="block font-medium text-gray-700 mb-2">
                Namn
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border rounded-md"
                placeholder="Uppdatera namn"
              />
            </div>
            
            {/* Description section */}
            <div className="mb-4">
              <label htmlFor="description" className="block font-medium text-gray-700 mb-2">
                Beskrivning
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="Uppdatera beskrivning"
              />
            </div>

            {/* Municipality section */}
            <div className="mb-4" ref={municipalityDropdownRef}>
              <label htmlFor="municipality" className="block font-medium text-gray-700 mb-2">
                Kommun
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="municipality"
                  value={municipality}
                  onChange={(e) => {
                    setMunicipality(e.target.value);
                    setMunicipalitySearchTerm(e.target.value);
                    setIsMunicipalityDropdownOpen(true);
                  }}
                  onFocus={() => {
                    setMunicipalitySearchTerm(municipality);
                    setIsMunicipalityDropdownOpen(true);
                  }}
                  className="w-full p-3 border rounded-md"
                  placeholder="Välj kommun"
                  autoComplete="off"
                />
                
                {isMunicipalityDropdownOpen && filteredMunicipalities.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredMunicipalities.map((mun, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setMunicipality(mun);
                          setMunicipalitySearchTerm("");
                          setIsMunicipalityDropdownOpen(false);
                        }}
                      >
                        {mun}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-2 bg-green-100 text-green-700 rounded">
                Profilen uppdaterad!
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded-md text-gray-700"
              disabled={isSubmitting}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Uppdaterar...' : 'Lägg till'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}