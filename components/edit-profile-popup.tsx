"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

interface EditProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentDescription?: string;
  userId: string;
}

export default function EditProfilePopup({
  isOpen,
  onClose,
  currentName,
  currentDescription = "",
  userId,
}: EditProfilePopupProps) {
  const [name, setName] = useState(currentName || "");
  const [description, setDescription] = useState(currentDescription || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: name })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setSuccess(true);
      // Clear the input field after successful submission
      setName("");
      
      // Show success message for a short time
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_description: description })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setSuccess(true);
      // Clear the input field after successful submission
      setDescription("");
      
      // Show success message for a short time
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Personuppgifter</h3>
          
          {/* Name section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="name" className="block font-medium text-gray-700">
                Namn
              </label>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow p-3 border rounded-md"
                placeholder="Uppdatera namn"
              />
              <button
                onClick={handleSubmitName}
                className="px-4 py-2 bg-black text-white rounded-md whitespace-nowrap"
                disabled={isSubmitting}
              >
                Lägg till
              </button>
            </div>
          </div>
          
          {/* Description section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="description" className="block font-medium text-gray-700">
                Beskrivning
              </label>
            </div>
            
            <div className="flex gap-2">
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-grow p-3 border rounded-md min-h-[100px]"
                placeholder="Uppdatera beskrivning"
              />
              <button
                onClick={handleSubmitDescription}
                className="px-4 py-2 bg-black text-white rounded-md self-start whitespace-nowrap"
                disabled={isSubmitting}
              >
                Lägg till
              </button>
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
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border rounded-md text-gray-700"
            disabled={isSubmitting}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}