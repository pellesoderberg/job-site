"use client";

import { createContext, useState, useContext, ReactNode } from "react";

interface UserAd {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  created_at: string;
}

interface SearchContextType {
  searchResults: UserAd[];
  setSearchResults: (results: UserAd[]) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchResults, setSearchResults] = useState<UserAd[]>([]);

  return (
    <SearchContext.Provider value={{ searchResults, setSearchResults }}>
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