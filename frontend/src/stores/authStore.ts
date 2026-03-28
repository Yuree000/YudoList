import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiClientError, api, setApiToken } from '../lib/api';
import type { AuthResponse, User } from '../sharedTypes';

const AUTH_STORAGE_KEY = 'yudolist.auth';

type AuthStatus = 'booting' | 'anonymous' | 'authenticated';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  username: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  status: AuthStatus;
  isSubmitting: boolean;
  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: 'booting',
      isSubmitting: false,
      async initialize() {
        if (get().status !== 'booting') {
          return;
        }

        const { token, user: cachedUser } = get();
        if (!token) {
          setApiToken(null);
          set({ user: null, status: 'anonymous' });
          return;
        }

        setApiToken(token);

        if (cachedUser) {
          set({ status: 'authenticated' });
        }

        const loadProfile = async () => {
          const user = await api.get<User>('/auth/profile', { timeoutMs: 5000 });
          set({ user, status: 'authenticated' });
        };

        try {
          if (cachedUser) {
            void loadProfile().catch((error) => {
              if (error instanceof ApiClientError && error.code === 401) {
                setApiToken(null);
                set({ token: null, user: null, status: 'anonymous' });
              }
            });
            return;
          }

          await loadProfile();
        } catch (error) {
          if (error instanceof ApiClientError && error.error === 'REQUEST_TIMEOUT') {
            set({ user: null, status: 'anonymous' });
            return;
          }

          setApiToken(null);
          set({ token: null, user: null, status: 'anonymous' });
        }
      },
      async login(payload) {
        set({ isSubmitting: true });

        try {
          const result = await api.post<AuthResponse>('/auth/login', payload);
          setApiToken(result.token);
          set({
            token: result.token,
            user: result.user,
            status: 'authenticated',
          });
        } finally {
          set({ isSubmitting: false });
        }
      },
      async register(payload) {
        set({ isSubmitting: true });

        try {
          const result = await api.post<AuthResponse>('/auth/register', payload);
          setApiToken(result.token);
          set({
            token: result.token,
            user: result.user,
            status: 'authenticated',
          });
        } finally {
          set({ isSubmitting: false });
        }
      },
      logout() {
        setApiToken(null);
        set({
          token: null,
          user: null,
          status: 'anonymous',
        });
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        setApiToken(state?.token ?? null);
      },
    },
  ),
);
