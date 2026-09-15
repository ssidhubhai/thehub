import { create } from 'zustand';

export interface UIState {
  isSearchOpen: boolean;
  isMobileNavOpen: boolean;
  activeAuthModal: 'login' | 'register' | null;
  activeProfileModal: boolean;
  activeProjectModal: boolean;

  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;
  setMobileNavOpen: (open: boolean) => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setProfileModalOpen: (open: boolean) => void;
  setProjectModalOpen: (open: boolean) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSearchOpen: false,
  isMobileNavOpen: false,
  activeAuthModal: null,
  activeProfileModal: false,
  activeProjectModal: false,

  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),
  openAuthModal: (mode) => set({ activeAuthModal: mode }),
  closeAuthModal: () => set({ activeAuthModal: null }),
  setProfileModalOpen: (open) => set({ activeProfileModal: open }),
  setProjectModalOpen: (open) => set({ activeProjectModal: open }),

  reset: () =>
    set({
      isSearchOpen: false,
      isMobileNavOpen: false,
      activeAuthModal: null,
      activeProfileModal: false,
      activeProjectModal: false,
    }),
}));
