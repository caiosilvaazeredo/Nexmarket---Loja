import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  
  // App state
  selectedSupermarketId: string | null;
  setSelectedSupermarketId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  
  selectedSupermarketId: null,
  setSelectedSupermarketId: (id) => set({ selectedSupermarketId: id }),
}));
