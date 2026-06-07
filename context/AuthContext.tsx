import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiUser,
  loginRequest,
  meRequest,
  registerRequest,
  type RegisterNotifications,
} from '@/lib/api';

const TOKEN_KEY = 'milkbasket-token';

type AuthContextValue = {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    location?: string;
  }) => Promise<RegisterNotifications>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback(async (nextToken: string, nextUser: ApiUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) return;

        const { user: storedUser } = await meRequest(storedToken);
        setToken(storedToken);
        setUser(storedUser);
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        const { token: nextToken, user: nextUser } = await loginRequest(email, password);
        if (nextUser.role !== 'customer') {
          throw new Error('Please use the admin panel for admin accounts');
        }
        await persistSession(nextToken, nextUser);
      },
      register: async (payload) => {
        const { token: nextToken, user: nextUser, notifications } = await registerRequest(payload);
        await persistSession(nextToken, nextUser);
        return notifications;
      },
      logout: async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [user, token, loading, persistSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
