import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useCartOptional } from '@/context/CartContext';

export function useSignOut() {
  const { logout } = useAuth();
  const router = useRouter();
  const cart = useCartOptional();

  return useCallback(async () => {
    await logout();
    cart?.clearCart();
    router.replace('/(auth)/login');
  }, [logout, router, cart]);
}
