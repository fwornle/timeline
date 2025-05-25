import React, { useEffect } from 'react';
import { useAppSelector } from '../store';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppSelector(state => state.preferences.theme);

  useEffect(() => {
    const currentTheme = theme || 'system';
    if (currentTheme === 'light') {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else if (currentTheme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      // System: remove both, let OS decide
      document.body.classList.remove('theme-light');
      document.body.classList.remove('theme-dark');
    }
  }, [theme]);

  return <>{children}</>;
};