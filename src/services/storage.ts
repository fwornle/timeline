const STORAGE_KEY = 'timeline_prefs';

// Camera state type for storing in preferences
export type StoredCameraState = {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
};

// Export as a type to fix import issues
export type Preferences = {
  // Repository information
  repoUrl?: string;
  username?: string;

  // Animation settings
  animationSpeed?: number;
  autoDrift?: boolean;

  // UI preferences
  theme?: 'light' | 'dark' | 'system';

  // Camera state
  cameraState?: StoredCameraState;

  // Timeline marker position
  markerPosition?: number;
}

// Simple obfuscation (not real encryption)
function encode(str: string) {
  // Use a more modern approach without deprecated functions
  return btoa(encodeURIComponent(str));
}
function decode(str: string) {
  try {
    // Use a more modern approach without deprecated functions
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

export function savePreferences(prefs: Preferences) {
  const data = encode(JSON.stringify(prefs));
  localStorage.setItem(STORAGE_KEY, data);
}

export function loadPreferences(): Preferences {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return {};
  try {
    return JSON.parse(decode(data));
  } catch {
    return {};
  }
}

export function clearPreferences() {
  localStorage.removeItem(STORAGE_KEY);
}