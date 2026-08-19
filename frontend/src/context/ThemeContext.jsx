import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('chato_theme') || 'dark';
  });

  const [wallpaper, setWallpaperState] = useState(() => {
    return localStorage.getItem('chato_wallpaper') || 'cyber';
  });

  const [soundEnabled, setSoundEnabledState] = useState(() => {
    return localStorage.getItem('chato_sound') !== 'false';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chato_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-wallpaper', wallpaper);
    localStorage.setItem('chato_wallpaper', wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    localStorage.setItem('chato_sound', String(soundEnabled));
  }, [soundEnabled]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (['dark', 'light'].includes(newTheme)) {
      setThemeState(newTheme);
    }
  };

  const setWallpaper = (newWallpaper) => {
    setWallpaperState(newWallpaper);
  };

  const toggleSound = () => {
    setSoundEnabledState((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        wallpaper,
        soundEnabled,
        toggleTheme,
        setTheme,
        setWallpaper,
        toggleSound,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
