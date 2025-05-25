import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RepositoryState {
  url: string;
  username: string;
  isConnected: boolean;
  lastSyncTime: number | null;
  connectionError: string | null;
  isValidating: boolean;
  metadata: {
    branch: string;
    lastCommitHash: string;
    lastCommitTime: number | null;
  } | null;
}

const initialState: RepositoryState = {
  url: '',
  username: '',
  isConnected: false,
  lastSyncTime: null,
  connectionError: null,
  isValidating: false,
  metadata: null,
};

const repositorySlice = createSlice({
  name: 'repository',
  initialState,
  reducers: {
    setRepositoryUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
      state.isConnected = false;
      state.connectionError = null;
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (action.payload) {
        state.connectionError = null;
        state.lastSyncTime = Date.now();
      }
    },
    setConnectionError: (state, action: PayloadAction<string | null>) => {
      state.connectionError = action.payload;
      if (action.payload) {
        state.isConnected = false;
      }
    },
    setIsValidating: (state, action: PayloadAction<boolean>) => {
      state.isValidating = action.payload;
    },
    setMetadata: (state, action: PayloadAction<RepositoryState['metadata']>) => {
      state.metadata = action.payload;
    },
    updateLastSyncTime: (state) => {
      state.lastSyncTime = Date.now();
    },
    resetRepository: (state) => {
      state.url = '';
      state.username = '';
      state.isConnected = false;
      state.lastSyncTime = null;
      state.connectionError = null;
      state.isValidating = false;
      state.metadata = null;
    },
  },
});

export const {
  setRepositoryUrl,
  setUsername,
  setIsConnected,
  setConnectionError,
  setIsValidating,
  setMetadata,
  updateLastSyncTime,
  resetRepository,
} = repositorySlice.actions;

export default repositorySlice.reducer;