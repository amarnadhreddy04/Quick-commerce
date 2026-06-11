import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { TERMS_VERSION } from '@/constants/terms';
import { useEffect, useRef, useState } from 'react';
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
import { checkDeliveryPincode } from '@/lib/api';
import { checkPincodeLocally } from '@/lib/deliveryPincodes';
import { lookupLocationByPincode } from '@/lib/location';
import {
  sanitizeName,
  sanitizePhone,
  sanitizePincode,
  validateEmail,
  validateName,
  validatePhone,
  validatePincode,
} from '@/lib/validators';
import { useColorScheme } from '@/components/useColorScheme';

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successNote, setSuccessNote] = useState('');
  const [lookingUpPincode, setLookingUpPincode] = useState(false);
  const [locationError, setLocationError] = useState('');
  const lastLookupRef = useRef('');

  useEffect(() => {
    const incoming = params.ref?.trim().toUpperCase();
    if (incoming) setReferralCode(incoming);
  }, [params.ref]);

  const resolvePincode = async (value: string) => {
    const pincodeError = validatePincode(value);
    if (pincodeError) {
      setLocation('');
      setLocationError(pincodeError);
      return;
    }

    if (lastLookupRef.current === value) return;

    setLookingUpPincode(true);
    setLocationError('');
    try {
      let availability = checkPincodeLocally(value);
      try {
        availability = await checkDeliveryPincode(value);
      } catch {
        availability = checkPincodeLocally(value);
      }
      if (!availability.available) {
        throw new Error(
          availability.message ??
            'Delivery is not available for this pincode. We serve: 523201, 523157, 522601, 513255'
        );
      }

      const detected = await lookupLocationByPincode(value);
      lastLookupRef.current = value;
      setLocation(detected);
    } catch (err) {
      lastLookupRef.current = '';
      setLocation('');
      setLocationError(err instanceof Error ? err.message : 'Could not find this pincode');
    } finally {
      setLookingUpPincode(false);
    }
  };

  useEffect(() => {
    if (pincode.length === 6) {
      resolvePincode(pincode);
    } else {
      lastLookupRef.current = '';
      setLocation('');
      setLocationError('');
    }
  }, [pincode]);

  const handleRegister = async () => {
    setError('');
    setSuccessNote('');

    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    const pincodeError = validatePincode(pincode);
    if (pincodeError) {
      setError(pincodeError);
      return;
    }

    if (!location.trim()) {
      setError(locationError || 'Enter pincode to detect your delivery location');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms & Conditions to create an account');
      return;
    }

    setLoading(true);
    try {
      const notifications = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        location: location.trim(),
        pincode,
        password,
        acceptedTerms: true,
        termsVersion: TERMS_VERSION,
        referralCode: referralCode.trim() || undefined,
      });

      const notes = [];
      if (notifications.emailSent) notes.push('Welcome email sent');
      if (notifications.smsSent) notes.push('Welcome SMS sent');
      if (notifications.smsDevMode) notes.push('SMS queued on server');
      if (notes.length) {
        setSuccessNote(notes.join(' · '));
        setTimeout(() => router.replace('/(tabs)'), 1800);
      } else {
        router.replace('/(tabs)');
      }
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
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            <TextInput
              value={name}
              onChangeText={(value) => setName(sanitizeName(value))}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Amar Kumar"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(sanitizePhone(value))}
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              maxLength={10}
              placeholder="9876543210"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Delivery Pincode</Text>
            <TextInput
              value={pincode}
              onChangeText={(value) => setPincode(sanitizePincode(value))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="523201"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            {lookingUpPincode ? (
              <View style={styles.lookupRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.fieldHintInfo, { color: colors.textSecondary }]}>
                  Finding location for pincode...
                </Text>
              </View>
            ) : location ? (
              <View
                style={[
                  styles.locationBox,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <Text style={[styles.locationText, { color: colors.text }]}>{location}</Text>
              </View>
            ) : null}
            {locationError ? (
              <Text style={styles.fieldHintError}>{locationError}</Text>
            ) : location ? (
              <Text style={[styles.fieldHintInfo, { color: colors.textSecondary }]}>
                Location detected from pincode
              </Text>
            ) : (
              <Text style={[styles.fieldHintInfo, { color: colors.textSecondary }]}>
                Available pincodes: 523201, 523157, 522601, 513255
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Referral code (optional)</Text>
            <TextInput
              value={referralCode}
              onChangeText={(value) => setReferralCode(value.toUpperCase().replace(/\s/g, ''))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Friend's code"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
          </View>

          <View style={styles.termsRow}>
            <Pressable
              onPress={() => setAcceptedTerms((value) => !value)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: acceptedTerms ? colors.primary : colors.border,
                    backgroundColor: acceptedTerms ? colors.primary : colors.background,
                  },
                ]}>
                {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
            <Text style={[styles.termsText, { color: colors.text }]}>
              I agree to the{' '}
              <Link href="/(auth)/terms" asChild>
                <Pressable>
                  <Text style={[styles.termsLink, { color: colors.primary }]}>Terms & Conditions</Text>
                </Pressable>
              </Link>
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {successNote ? <Text style={[styles.success, { color: colors.primary }]}>{successNote}</Text> : null}

          <Pressable
            onPress={handleRegister}
            disabled={loading || lookingUpPincode || !acceptedTerms}
            style={[
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: loading || lookingUpPincode || !acceptedTerms ? 0.7 : 1,
              },
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?
            </Text>
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
  locationBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  fieldHintError: {
    fontSize: 12,
    marginTop: spacing.xs,
    color: '#EF4444',
  },
  fieldHintInfo: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  termsText: { flex: 1, fontSize: 14, lineHeight: 20 },
  termsLink: { fontWeight: '700' },
  error: { color: '#EF4444', fontSize: 13, marginTop: spacing.sm },
  success: { fontSize: 13, marginTop: spacing.sm, fontWeight: '600' },
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
