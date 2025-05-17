import React, { createContext, useContext, useState, useCallback } from 'react';
import { loadPreferences, savePreferences } from '../services/storage';
import type { Preferences } from '../services/storage';

interface PreferencesContextType {
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => void;
  refreshPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferencesState] = useState<Preferences>(loadPreferences());

  const setPreferences = useCallback((prefs: Preferences) => {
    setPreferencesState(prefs);
    savePreferences(prefs);
  }, []);

  const refreshPreferences = useCallback(() => {
    setPreferencesState(loadPreferences());
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences, refreshPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}