import React, { useEffect } from 'react';
import { usePreferences } from './PreferencesContext';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { preferences } = usePreferences();

  useEffect(() => {
    const theme = preferences.theme || 'system';
    if (theme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      // System: remove both, let OS decide
      document.body.classList.remove('theme-light');
      document.body.classList.remove('theme-dark');
    }
  }, [preferences.theme]);

  return <>{children}</>;
}; 