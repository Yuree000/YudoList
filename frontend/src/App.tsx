import { useEffect, useEffectEvent } from 'react';
import { AuthPage } from './components/auth/AuthPage';
import { AuthenticatedHome } from './components/layout/AuthenticatedHome';
import { BootScreen } from './components/layout/BootScreen';
import { focusSearchInput } from './lib/searchRef';
import { useAuthStore } from './stores/authStore';
import { useListStore } from './stores/listStore';
import { useThemeStore } from './stores/themeStore';

export default function App() {
  const authStatus = useAuthStore((state) => state.status);
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initialize);
  const loadItems = useListStore((state) => state.loadItems);
  const clearItems = useListStore((state) => state.clear);
  const syncPendingItems = useListStore((state) => state.syncPendingItems);

  const bootApplication = useEffectEvent(() => {
    initializeTheme();
    void initializeAuth();
  });

  const syncSurface = useEffectEvent(() => {
    if (authStatus !== 'authenticated') {
      clearItems();
      return;
    }

    void loadItems().catch(() => {
      clearItems();
    });
  });

  const bindOnlineRecovery = useEffectEvent(() => {
    if (authStatus !== 'authenticated') {
      return undefined;
    }

    const handleOnline = () => {
      void (async () => {
        await syncPendingItems();
        await loadItems().catch(() => undefined);
      })();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  });

  useEffect(() => {
    bootApplication();
  }, [bootApplication]);

  useEffect(() => {
    syncSurface();
  }, [authStatus, syncSurface]);

  useEffect(() => bindOnlineRecovery(), [bindOnlineRecovery]);

  // Global keyboard shortcuts (authenticated only)
  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      const tag = document.activeElement?.tagName;

      // Ctrl+K — focus search bar
      if (isMod && e.key === 'k') {
        e.preventDefault();
        focusSearchInput();
        return;
      }

      // Ctrl+Z — undo (skip when typing in input/textarea)
      if (isMod && e.key === 'z' && !e.shiftKey) {
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        void useListStore.getState().undo();
        return;
      }

      // Ctrl+Shift+Z — redo
      if (isMod && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        void useListStore.getState().redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authStatus]);

  if (authStatus === 'booting') {
    return <BootScreen />;
  }

  if (authStatus === 'anonymous') {
    return <AuthPage />;
  }

  return <AuthenticatedHome />;
}
