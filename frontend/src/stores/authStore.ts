import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, setApiToken } from '../lib/api';
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

        const { token } = get();
        if (!token) {
          setApiToken(null);
          set({ user: null, status: 'anonymous' });
          return;
        }

        setApiToken(token);

        try {
          const user = await api.get<User>('/auth/profile');
          set({ user, status: 'authenticated' });
        } catch {
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
