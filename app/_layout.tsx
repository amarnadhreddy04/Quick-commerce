import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import UnavailableLocation from '@/components/UnavailableLocation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { DeliveryAreaProvider, useDeliveryArea } from '@/context/DeliveryAreaContext';

export {
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { status } = useDeliveryArea();

  if (status === 'loading') {
    return <UnavailableLocation mode="loading" />;
  }

  if (status === 'permission_denied') {
    return <UnavailableLocation mode="permission_denied" />;
  }

  if (status === 'unavailable') {
    return <UnavailableLocation mode="unavailable" />;
  }

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="category/[id]"
          options={{ headerShown: true, title: 'Category', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="payment"
          options={{ headerShown: true, title: 'Payment', headerBackTitle: 'Basket' }}
        />
      </Stack>
    </CartProvider>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  return (
    <DeliveryAreaProvider>
      <AppContent />
    </DeliveryAreaProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <CatalogProvider>
        <RootNavigator />
      </CatalogProvider>
    </AuthProvider>
  );
}
