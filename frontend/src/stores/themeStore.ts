import { create } from 'zustand';

const THEME_STORAGE_KEY = 'yudolist.theme';
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = Exclude<ThemeMode, 'system'>;

let initialized = false;
let mediaQueryList: MediaQueryList | null = null;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  initialize: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  resolvedTheme: 'light',
  initialize() {
    if (initialized || typeof window === 'undefined') {
      return;
    }

    const storedMode = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextMode =
      storedMode === 'light' || storedMode === 'dark' || storedMode === 'system'
        ? storedMode
        : 'system';
    const nextResolvedTheme = resolveTheme(nextMode);

    applyTheme(nextResolvedTheme);
    set({
      mode: nextMode,
      resolvedTheme: nextResolvedTheme,
    });

    mediaQueryList = window.matchMedia(SYSTEM_THEME_QUERY);
    mediaQueryList.addEventListener('change', () => {
      if (get().mode !== 'system') {
        return;
      }

      const systemTheme = getSystemTheme();
      applyTheme(systemTheme);
      set({ resolvedTheme: systemTheme });
    });

    initialized = true;
  },
  setMode(mode) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }

    const nextResolvedTheme = resolveTheme(mode);
    applyTheme(nextResolvedTheme);
    set({
      mode,
      resolvedTheme: nextResolvedTheme,
    });
  },
}));
