"use client";

import { createContext, useState, useContext, ReactNode } from "react";

interface UserAd {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  region: string;
  municipality: string | null;
  created_at: string;
  // Add poster_category if it's part of the ad details you want in context
  // For now, assuming it's mainly for display in UserAdsSection
  poster_category?: string;
}

interface SearchContextType {
  searchResults: UserAd[];
  setSearchResults: (results: UserAd[]) => void;
  searchAttempted: boolean; // New state
  setSearchAttempted: (attempted: boolean) => void; // New setter
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<UserAd[]>([]);
  const [searchAttempted, setSearchAttempted] = useState(false); // Initialize new state

  return (
    <SearchContext.Provider value={{ searchResults, setSearchResults, searchAttempted, setSearchAttempted }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}