import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { loadPreferences, savePreferences, type Preferences } from '../../services/storage';

interface PreferencesState extends Preferences {
  isLoaded: boolean;
}

const initialState: PreferencesState = {
  ...loadPreferences(),
  isLoaded: true,
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    updatePreferences: (state, action: PayloadAction<Partial<Preferences>>) => {
      Object.assign(state, action.payload);
      const { isLoaded: _, ...prefs } = state;
      savePreferences(prefs);
    },
    setPreferences: (state, action: PayloadAction<Preferences>) => {
      const { isLoaded } = state;
      Object.assign(state, action.payload, { isLoaded });
      const { isLoaded: __, ...prefs } = state;
      savePreferences(prefs);
    },
    refreshPreferences: (state) => {
      const loaded = loadPreferences();
      Object.assign(state, loaded, { isLoaded: true });
    },
    clearPreferences: (state) => {
      Object.keys(state).forEach(key => {
        if (key !== 'isLoaded') {
          delete (state as Record<string, unknown>)[key];
        }
      });
      state.isLoaded = true;
      savePreferences({});
    },
  },
});

export const { updatePreferences, setPreferences, refreshPreferences, clearPreferences } = preferencesSlice.actions;
export default preferencesSlice.reducer;