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
  const [userAds, setUserAds] = useState<any[]>([]);
  const [expandedAdId, setExpandedAdId] = useState<number | null>(null);
  const [applications, setApplications] = useState<{[key: number]: any[]}>({});
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ads' | 'applications'>('ads');
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
      const { data, error } = await supabase
        .from('profiles')
        .select('username, user_description, email_name, municipality, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error("Misslyckades att hämta användardata:", error);
      } else {
        setUserData(data);
      }
      
      // Fetch user's ads
      const { data: adsData, error: adsError } = await supabase
        .from('user_ads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (adsError) {
        console.error("Misslyckades att hämta annonser:", adsError);
      } else {
        setUserAds(adsData || []);
      }
      
      // Fetch user's applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('job_applications')
        .select(`
          id,
          ad_id,
          applicant_id,
          poster_id,
          status,
          created_at,
          user_ads!job_applications_ad_id_fkey(title, region, municipality),
          profiles!job_applications_poster_id_fkey(username, email_name)
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });
      
      if (applicationsError) {
        console.error("Misslyckades att hämta ansökningar:", applicationsError);
      } else {
        // Format applications data
        const formattedApplications = applicationsData?.map(app => ({
          id: app.id,
          ad_id: app.ad_id,
          status: app.status,
          created_at: app.created_at,
          ad_title: app.user_ads?.title || 'Unknown Ad',
          ad_region: app.user_ads?.region || '',
          ad_municipality: app.user_ads?.municipality || '',
          poster_username: app.profiles?.username || app.profiles?.email_name || 'Unknown User'
        })) || [];
        
        setUserApplications(formattedApplications);
      }
      
      setLoading(false);
    }
    
    getUser();
  }, []);

  const toggleApplications = async (adId: number) => {
    if (expandedAdId === adId) {
      // If already expanded, collapse it
      setExpandedAdId(null);
      return;
    }
    
    // Expand this ad
    setExpandedAdId(adId);
    
    // If we haven't loaded applications for this ad yet, fetch them
    if (!applications[adId]) {
      try {
        const { data, error } = await supabase
          .from('job_applications')
          .select(`
            id, 
            ad_id, 
            applicant_id, 
            poster_id, 
            status, 
            created_at,
            profiles!job_applications_applicant_id_fkey(username)
          `)
          .eq('ad_id', adId)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error("Error fetching applications:", error);
          return;
        }
        
        // Format the applications data
        const formattedApplications = data.map(app => ({
          id: app.id,
          status: app.status,
          created_at: app.created_at,
          applicant_username: app.profiles?.username || 'Unknown User'
        }));
        
        // Update the applications state
        setApplications(prev => ({
          ...prev,
          [adId]: formattedApplications
        }));
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      }
    }
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading...</div>;
  }

  const displayName = userData?.username || userData?.email_name || "User";
  const presentation = userData?.user_description || "Ingen presentation tillgänglig";

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      <div className="w-full max-w-md p-4">
        {/* Profile header with avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-full mb-4 overflow-hidden">
            {userData?.avatar_url ? (
              <img 
                src={userData.avatar_url} 
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
          </div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {userData?.municipality && (
            <p className="text-sm text-gray-500 flex items-center justify-center">
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
                className="mr-1"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              {userData.municipality}
            </p>
          )}
          
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
            <Link href={`/protected/user-profile?id=${user.id}`} className="flex-1">
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
        
        {/* Tabs for Ads and Applications */}
        <div className="border-t pt-6 mt-6">
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveTab('ads')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'ads' 
                  ? 'border-b-2 border-blue-500 text-blue-500' 
                  : 'text-gray-500'
              }`}
            >
              Mina annonser
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`py-2 px-4 font-medium ${
                activeTab === 'applications' 
                  ? 'border-b-2 border-blue-500 text-blue-500' 
                  : 'text-gray-500'
              }`}
            >
              Mina ansökningar
            </button>
          </div>
          
          {/* User Ads Section */}
          {activeTab === 'ads' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Mina annonser</h2>
              {userAds.length > 0 ? (
                <div className="space-y-4">
                  {userAds.map((ad) => (
                    <div key={ad.id} className="border rounded-md overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium">{ad.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {ad.region} {ad.municipality ? `• ${ad.municipality}` : ''}
                            </p>
                            <p className="mt-2 text-sm">{ad.description.substring(0, 100)}...</p>
                          </div>
                          {ad.price && (
                            <div className="text-lg font-bold">
                              {ad.price} kr
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Skapad: {new Date(ad.created_at).toLocaleDateString()}
                          </div>
                          
                          <button 
                            onClick={() => toggleApplications(ad.id)}
                            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                          >
                            {expandedAdId === ad.id ? 'Dölj ansökningar' : 'Visa ansökningar'}
                          </button>
                        </div>
                        
                        {/* Applications dropdown */}
                        {expandedAdId === ad.id && (
                          <div className="mt-4 border-t pt-4">
                            <h4 className="text-md font-medium mb-2">Ansökningar</h4>
                            
                            {applications[ad.id] ? (
                              applications[ad.id].length > 0 ? (
                                <div className="space-y-3">
                                  {applications[ad.id].map((app) => (
                                    <div key={app.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                      <div>
                                        <div className="font-medium">{app.applicant_username}</div>
                                        <div className="text-xs text-gray-500">
                                          {new Date(app.created_at).toLocaleDateString()}
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                          app.status === 'accepted' 
                                            ? 'bg-green-100 text-green-800' 
                                            : app.status === 'rejected' 
                                              ? 'bg-red-100 text-red-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                        </span>
                                        
                                        {app.status === 'accepted' && (
                                          <Link href={`/protected/messages?application=${app.id}`}>
                                            <button className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                                              Messages
                                            </button>
                                          </Link>
                                        )}
                                        
                                        {/* Add View Application button for pending applications */}
                                        {app.status === 'pending' && (
                                          <Link href={`/protected/applications?application=${app.id}`}>
                                            <button className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                                              Granska
                                            </button>
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Inga ansökningar tillgängliga.</p>
                              )
                            ) : (
                              <div className="text-center py-2">
                                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-1">Laddar ansökningar...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500 mb-4">Du har inga annonser än</p>
                  <Link href="/protected/create-ad">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                      Skapa annons
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* User Applications Section */}
          {activeTab === 'applications' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Mina ansökningar</h2>
              
              {userApplications.length > 0 ? (
                <div className="space-y-4">
                  {userApplications.map((app) => (
                    <div key={app.id} className="border rounded-md overflow-hidden p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium">{app.ad_title}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {app.ad_region} {app.ad_municipality ? `• ${app.ad_municipality}` : ''}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Upplagd av: {app.poster_username}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          app.status === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : app.status === 'rejected' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {app.status === 'pending' ? 'Pågående' :
                           app.status === 'accepted' ? 'Accepterad' : 'Avvisad'}
                        </span>
                      </div>
                      
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Ansökt: {new Date(app.created_at).toLocaleDateString()}
                        </div>
                        
                        {app.status === 'accepted' && (
                          <Link href={`/protected/messages?application=${app.id}`}>
                            <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors">
                              Visa meddelanden
                            </button>
                          </Link>
                        )}
                        
                        {app.status === 'pending' && (
                          <div className="flex space-x-2">
                            <div className="text-sm text-yellow-600">
                              Väntar på svar
                            </div>
                            {/* Removed the View Application button for applicants */}
                          </div>
                        )}
                        
                        {app.status === 'rejected' && (
                          <div className="text-sm text-red-600">
                            Ansökan avvisad
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500 mb-4">Du har inga ansökningar än</p>
                  <Link href="/">
                    <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                      Bläddra annonser
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Profile Popup */}
      <EditProfilePopup 
        isOpen={isEditPopupOpen}
        onClose={() => setIsEditPopupOpen(false)}
        currentName={displayName}
        currentDescription={userData?.user_description || ""}
        currentMunicipality={userData?.municipality || ""}
        currentAvatarUrl={userData?.avatar_url || ""}
        userId={user?.id}
      />
    </div>
  );
}