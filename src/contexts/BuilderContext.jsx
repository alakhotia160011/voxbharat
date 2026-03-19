import React, { createContext, useContext, useState } from 'react';

const BuilderContext = createContext(null);

export function BuilderProvider({ children }) {
  const [showBuilder, setShowBuilder] = useState(false);
  return (
    <BuilderContext.Provider value={{ showBuilder, setShowBuilder }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider');
  return ctx;
}
