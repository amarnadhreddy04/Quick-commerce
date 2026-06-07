import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/components/useColorScheme';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and password are required');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        password,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Register to start ordering daily essentials
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: 'Full Name', value: name, setter: setName, placeholder: 'Amar Kumar' },
            { label: 'Email', value: email, setter: setEmail, placeholder: 'you@example.com', email: true },
            { label: 'Phone', value: phone, setter: setPhone, placeholder: '+91 98765 43210', phone: true },
            { label: 'Delivery Location', value: location, setter: setLocation, placeholder: 'Sector 62, Noida' },
            { label: 'Password', value: password, setter: setPassword, placeholder: 'Min 6 characters', secure: true },
          ].map((field) => (
            <View key={field.label}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
              <TextInput
                value={field.value}
                onChangeText={field.setter}
                secureTextEntry={field.secure}
                autoCapitalize={field.email ? 'none' : 'sentences'}
                keyboardType={field.phone ? 'phone-pad' : field.email ? 'email-address' : 'default'}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              />
            </View>
          ))}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text style={[styles.link, { color: colors.primary }]}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, marginBottom: spacing.sm },
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  label: { fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  error: { color: '#EF4444', fontSize: 13, marginTop: spacing.sm },
  button: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  footerText: { fontSize: 14 },
  link: { fontSize: 14, fontWeight: '700' },
});
