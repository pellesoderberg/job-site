"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from 'uuid';

interface EditProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentDescription?: string;
  currentMunicipality?: string;
  currentAvatarUrl?: string;
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
  currentAvatarUrl = "",
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatarUrl || "");
  
  const supabase = createClient();
  const municipalityDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      // Reset avatar preview to current avatar URL when popup opens
      setAvatarPreview(currentAvatarUrl || "");
    }
  }, [isOpen, currentAvatarUrl]);

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size should be less than 2MB");
      return;
    }

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      let avatarUrl = currentAvatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}-${uuidv4()}.${fileExt}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Error uploading image: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: name,
          user_description: description,
          municipality: municipality || null,
          avatar_url: avatarUrl
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
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
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
          Uppdatera din information nedan.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Personuppgifter</h3>
            
            {/* Profile Image section */}
            <div className="mb-6 flex flex-col items-center">
              <div 
                onClick={handleAvatarClick}
                className="w-24 h-24 bg-gray-200 rounded-full mb-2 overflow-hidden cursor-pointer relative hover:opacity-90 transition-opacity"
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
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
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <p className="text-sm text-gray-500">Klicka för att ladda upp profilbild</p>
            </div>
            
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