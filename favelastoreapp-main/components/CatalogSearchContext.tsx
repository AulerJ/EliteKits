"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type CatalogSearchContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const CatalogSearchContext = createContext<CatalogSearchContextValue | null>(null);

export function CatalogSearchProvider({
  initialSearch = "",
  children,
}: {
  initialSearch?: string;
  children: ReactNode;
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const setQuery = useCallback((q: string) => setSearchQuery(q), []);
  return (
    <CatalogSearchContext.Provider value={{ searchQuery, setSearchQuery: setQuery }}>
      {children}
    </CatalogSearchContext.Provider>
  );
}

export function useCatalogSearch(): CatalogSearchContextValue {
  const ctx = useContext(CatalogSearchContext);
  if (!ctx) return { searchQuery: "", setSearchQuery: () => {} };
  return ctx;
}
