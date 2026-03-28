import { useEffect, useEffectEvent } from 'react';
import { AuthPage } from './components/auth/AuthPage';
import { AuthenticatedHome } from './components/layout/AuthenticatedHome';
import { BootScreen } from './components/layout/BootScreen';
import { ApiClientError } from './lib/api';
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
      return undefined;
    }

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const attemptLoad = async (attempt: number) => {
      try {
        await loadItems();
      } catch (error) {
        if (disposed) {
          return;
        }

        const isRetryable =
          !(error instanceof ApiClientError)
          || error.error === 'REQUEST_TIMEOUT'
          || error.error === 'REQUEST_FAILED'
          || error.code >= 500;

        if (!isRetryable || attempt >= 4) {
          clearItems();
          return;
        }

        retryTimer = setTimeout(() => {
          void attemptLoad(attempt + 1);
        }, 1200 * (attempt + 1));
      }
    };

    void attemptLoad(0);

    return () => {
      disposed = true;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
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
    return syncSurface();
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
