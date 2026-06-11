import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Profile',
      }}>
      <Stack.Screen name="address" options={{ title: 'Delivery Address' }} />
      <Stack.Screen name="wallet" options={{ title: 'Wallet' }} />
      <Stack.Screen name="email" options={{ title: 'Email' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="help" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="refer" options={{ title: 'Refer & Earn' }} />
    </Stack>
  );
}
