"use client";

import { createClient } from "@/utils/supabase/client";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import EditProfilePopup from "@/components/edit-profile-popup";

export default function UserProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push("/sign-in");
        return;
      }
      
      setUser(user);
      
      // Fetch user data from the 'profiles' table
      // When fetching user data:
      const { data, error } = await supabase
        .from('profiles')
        .select('username, user_description')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user data:", error);
      } else {
        setUserData(data);
      }
      
      setLoading(false);
    }
    
    getUser();
  }, []);

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading...</div>;
  }

  const displayName = userData?.username || userData?.user_first_name || "User";
  const presentation = userData?.user_description || "No presentation available";

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      <div className="w-full max-w-md p-4">
        {/* Profile header with avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 overflow-hidden">
            {/* Avatar placeholder */}
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-gray-500">På Blocket sedan 2020</p>
          
          {/* Action buttons */}
          <div className="flex gap-4 mt-6 w-full">
            <button 
              onClick={() => setIsEditPopupOpen(true)}
              className="flex-1 w-full bg-blue-500 text-white py-2 px-4 rounded flex items-center justify-center"
            >
              <svg className="mr-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Redigera profil
            </button>
            <Link href="#" className="flex-1">
              <button className="w-full border border-gray-300 py-2 px-4 rounded">
                Visa publik profil
              </button>
            </Link>
          </div>
        </div>
        
        {/* Profile sections */}
        <div className="border-t pt-6">
          <h2 className="text-xl font-medium mb-4">Om mig</h2>
          <p className="text-gray-700">{presentation}</p>
        </div>
      </div>
      
      {/* Edit Profile Popup */}
      {/*When rendering the EditProfilePopup component:*/}
      <EditProfilePopup 
        isOpen={isEditPopupOpen}
        onClose={() => setIsEditPopupOpen(false)}
        currentName={displayName}
        currentDescription={userData?.user_description || ""}
        userId={user?.id}
      />
    </div>
  );
}