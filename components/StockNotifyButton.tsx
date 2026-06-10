import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';
import {
  fetchStockNotifyStatus,
  subscribeStockNotify,
  unsubscribeStockNotify,
} from '@/lib/api';

type Props = {
  productId: string;
  productName: string;
  compact?: boolean;
};

export default function StockNotifyButton({ productId, productName, compact = false }: Props) {
  const router = useRouter();
  const { token } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!!token);

  const loadStatus = useCallback(async () => {
    if (!token) {
      setSubscribed(false);
      setChecking(false);
      return;
    }

    try {
      const status = await fetchStockNotifyStatus(token, productId);
      setSubscribed(status.subscribed);
    } catch {
      setSubscribed(false);
    } finally {
      setChecking(false);
    }
  }, [productId, token]);

  useEffect(() => {
    setChecking(!!token);
    loadStatus().catch(() => undefined);
  }, [loadStatus, token]);

  const promptLogin = () => {
    Alert.alert('Sign in required', 'Please log in to get notified when this product is back in stock.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log in', onPress: () => router.push('/(auth)/login') },
    ]);
  };

  const handlePress = async () => {
    if (!token) {
      promptLogin();
      return;
    }

    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeStockNotify(token, productId);
        setSubscribed(false);
      } else {
        await subscribeStockNotify(token, productId);
        setSubscribed(true);
        Alert.alert(
          'You will be notified',
          `We'll let you know when ${productName} is back in stock.`
        );
      }
    } catch (error) {
      Alert.alert(
        'Could not update alert',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (subscribed) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={loading}
        style={[
          styles.subscribedButton,
          compact && styles.subscribedButtonCompact,
          { backgroundColor: colors.wallet, borderColor: colors.primary },
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Ionicons name="notifications" size={compact ? 14 : 16} color={colors.primary} />
            <Text style={[styles.subscribedText, { color: colors.primary }, compact && styles.subscribedTextCompact]}>
              {compact ? 'Notifying' : "You'll be notified"}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={loading}
      style={[
        styles.notifyButton,
        compact && styles.notifyButtonCompact,
        { backgroundColor: colors.primary },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="notifications-outline" size={compact ? 14 : 16} color="#FFFFFF" />
          <Text style={[styles.notifyText, compact && styles.notifyTextCompact]}>Notify me</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 32,
    justifyContent: 'center',
  },
  wrapCompact: {
    alignItems: 'flex-end',
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  notifyButtonCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  notifyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  notifyTextCompact: {
    fontSize: 11,
  },
  subscribedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  subscribedButtonCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  subscribedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subscribedTextCompact: {
    fontSize: 11,
  },
});
