import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider, isRiderUser, useAuth } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { CatalogProvider } from '@/context/CatalogContext';
import { DeliveryAreaProvider } from '@/context/DeliveryAreaContext';
import { ProductDetailProvider } from '@/context/ProductDetailContext';

export {
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

function AuthRedirect() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inRiderGroup = segments[0] === '(rider)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthGroup) {
      router.replace(isRiderUser(user) ? '/(rider)/deliveries' : '/(tabs)');
      return;
    }

    if (user && isRiderUser(user) && !inRiderGroup) {
      router.replace('/(rider)/deliveries');
      return;
    }

    if (user && !isRiderUser(user) && inRiderGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return null;
}

function RootStack() {
  return (
    <>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(rider)" />
        <Stack.Screen
          name="category/[id]"
          options={{ headerShown: true, title: 'Category', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="payment"
          options={{ headerShown: true, title: 'Payment', headerBackTitle: 'Basket' }}
        />
        <Stack.Screen
          name="checkout"
          options={{ headerShown: true, title: 'Checkout', headerBackTitle: 'Payment' }}
        />
        <Stack.Screen
          name="order-success"
          options={{ headerShown: true, title: 'Order Placed', headerBackVisible: false }}
        />
        <Stack.Screen
          name="order/[id]"
          options={{ headerShown: true, title: 'Order Details', headerBackTitle: 'Orders' }}
        />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
      </Stack>
    </>
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

  return (
    <AuthProvider>
      <DeliveryAreaProvider>
        <CatalogProvider>
          <CartProvider>
            <ProductDetailProvider>
              {loaded ? <RootStack /> : null}
            </ProductDetailProvider>
          </CartProvider>
        </CatalogProvider>
      </DeliveryAreaProvider>
    </AuthProvider>
  );
}
