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
const PINCODE_KEY = 'milkbasket-pincode';
const ACTIVE_ADDRESS_KEY = 'milkbasket-active-address-id';

async function withStoredPincode(user: ApiUser): Promise<ApiUser> {
  if (user.pincode?.replace(/\D/g, '').length === 6) {
    return user;
  }
  const stored = (await AsyncStorage.getItem(PINCODE_KEY))?.replace(/\D/g, '');
  if (stored?.length === 6) {
    return { ...user, pincode: stored };
  }
  return user;
}

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
    pincode: string;
  }) => Promise<RegisterNotifications>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback(async (nextToken: string, nextUser: ApiUser) => {
    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    if (nextUser.pincode) {
      await AsyncStorage.setItem(PINCODE_KEY, nextUser.pincode);
    }
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) return;

        const { user: storedUser } = await meRequest(storedToken);
        const userWithPincode = await withStoredPincode(storedUser);
        setToken(storedToken);
        setUser(userWithPincode);
        if (userWithPincode.pincode) {
          await AsyncStorage.setItem(PINCODE_KEY, userWithPincode.pincode);
        }
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
        const userWithPincode = await withStoredPincode(nextUser);
        await persistSession(nextToken, userWithPincode);
      },
      register: async (payload) => {
        const { token: nextToken, user: nextUser, notifications } = await registerRequest(payload);
        await AsyncStorage.setItem(PINCODE_KEY, payload.pincode);
        await persistSession(nextToken, nextUser);
        return notifications;
      },
      refreshUser: async () => {
        if (!token) return;
        const { user: nextUser } = await meRequest(token);
        const userWithPincode = await withStoredPincode(nextUser);
        setUser(userWithPincode);
        if (userWithPincode.pincode) {
          await AsyncStorage.setItem(PINCODE_KEY, userWithPincode.pincode);
        }
      },
      logout: async () => {
        await AsyncStorage.multiRemove([TOKEN_KEY, PINCODE_KEY, ACTIVE_ADDRESS_KEY]);
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
