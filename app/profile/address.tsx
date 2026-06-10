import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PincodeAreaPicker from '@/components/PincodeAreaPicker';
import ProfileDetailCard from '@/components/ProfileDetailCard';
import Colors from '@/constants/Colors';
import { radius, spacing } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { useDeliveryArea } from '@/context/DeliveryAreaContext';
import { ALLOWED_PINCODES, getPincodeLocation, type PincodeLocation } from '@/lib/deliveryPincodes';
import type { DeliveryAddress } from '@/types';

const LABEL_OPTIONS = ['Home', 'Work', 'Other'] as const;

type FormState = {
  label: string;
  line1: string;
  line2: string;
  pincode: string;
};

const EMPTY_FORM: FormState = {
  label: 'Home',
  line1: '',
  line2: '',
  pincode: '',
};

export default function DeliveryAddressScreen() {
  const router = useRouter();
  const {
    addresses,
    activeAddress,
    addressesLoading,
    status,
    selectAddress,
    addAddress,
    editAddress,
    removeAddress,
  } = useDeliveryArea();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedArea, setSelectedArea] = useState<PincodeLocation | null>(null);

  const resetFormState = () => {
    setFormError('');
    setSelectedArea(null);
  };

  const openCreateModal = () => {
    setEditingAddress(null);
    setForm(EMPTY_FORM);
    resetFormState();
    setModalVisible(true);
  };

  const openEditModal = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setForm({
      label: address.label,
      line1: address.line1,
      line2: address.line2 ?? '',
      pincode: address.pincode,
    });
    resetFormState();
    setSelectedArea(getPincodeLocation(address.pincode));
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAddress(null);
    setForm(EMPTY_FORM);
    resetFormState();
  };

  const selectArea = (location: PincodeLocation) => {
    setSelectedArea(location);
    setForm((current) => ({ ...current, pincode: location.pincode }));
    setFormError('');
  };

  const validateForm = () => {
    const label = form.label.trim() || 'Home';
    const line1 = form.line1.trim();

    if (!selectedArea || !form.pincode) {
      return 'Tap a delivery area to auto-fill pincode and location';
    }
    if (!line1) {
      return 'Enter your house / flat / street details';
    }
    if (!label) {
      return 'Choose an address label';
    }
    return null;
  };

  const handleSave = async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setFormError('');
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim() || 'Home',
        line1: form.line1.trim(),
        line2: form.line2.trim() || undefined,
        pincode: form.pincode.trim(),
      };

      if (editingAddress) {
        await editAddress(editingAddress.id, payload);
      } else {
        await addAddress({
          ...payload,
          isDefault: addresses.length === 0,
        });
      }
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setFormError(message);
      Alert.alert('Could not save address', message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelect = async (addressId: string) => {
    if (activeAddress?.id === addressId) return;

    const wasUnavailable = status === 'unavailable';
    setSwitchingId(addressId);
    try {
      await selectAddress(addressId);
      if (wasUnavailable) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(
        'Could not switch address',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = (address: DeliveryAddress) => {
    Alert.alert('Delete address', `Remove ${address.label} from your saved addresses?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeAddress(address.id).catch((error) => {
            Alert.alert(
              'Could not delete address',
              error instanceof Error ? error.message : 'Please try again.'
            );
          });
        },
      },
    ]);
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}>
        <ProfileDetailCard title="Delivering to">
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Switch between saved addresses. Products and delivery availability update based on the
            selected pincode.
          </Text>
          {activeAddress ? (
            <View style={[styles.activeBanner, { backgroundColor: colors.wallet }]}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <View style={styles.activeBannerText}>
                <Text style={[styles.activeLabel, { color: colors.primary }]}>Active address</Text>
                <Text style={[styles.activeValue, { color: colors.text }]}>{activeAddress.fullAddress}</Text>
              </View>
            </View>
          ) : null}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status === 'available' ? colors.wallet : '#FEE2E2' },
            ]}>
            <Text
              style={[
                styles.statusText,
                { color: status === 'available' ? colors.primary : '#B91C1C' },
              ]}>
              {status === 'available' ? 'Delivery available here' : 'Delivery not available here'}
            </Text>
          </View>
        </ProfileDetailCard>

        <ProfileDetailCard title="Saved addresses">
          {addressesLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <View style={styles.addressList}>
              {addresses.map((address) => {
                const isActive = activeAddress?.id === address.id;
                const isSwitching = switchingId === address.id;

                return (
                  <Pressable
                    key={address.id}
                    onPress={() => handleSelect(address.id)}
                    style={[
                      styles.addressCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}>
                    <View style={styles.addressHeader}>
                      <View style={styles.addressTitleRow}>
                        <Ionicons
                          name={isActive ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isActive ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.addressLabel, { color: colors.text }]}>{address.label}</Text>
                        {isActive ? (
                          <View style={[styles.activePill, { backgroundColor: colors.wallet }]}>
                            <Text style={[styles.activePillText, { color: colors.primary }]}>Active</Text>
                          </View>
                        ) : null}
                      </View>
                      {isSwitching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                    </View>

                    <Text style={[styles.addressLine, { color: colors.text }]}>{address.line1}</Text>
                    {address.line2 ? (
                      <Text style={[styles.addressMeta, { color: colors.textSecondary }]}>{address.line2}</Text>
                    ) : null}
                    <Text style={[styles.addressMeta, { color: colors.textSecondary }]}>
                      {address.areaLabel} · {address.pincode}
                    </Text>

                    <View style={styles.addressActions}>
                      <Pressable onPress={() => openEditModal(address)} hitSlop={8}>
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                      </Pressable>
                      {addresses.length > 1 ? (
                        <Pressable onPress={() => handleDelete(address)} hitSlop={8}>
                          <Text style={[styles.actionText, { color: '#B91C1C' }]}>Delete</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={openCreateModal}
            style={[styles.addButton, { borderColor: colors.primary, backgroundColor: colors.wallet }]}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.addButtonText, { color: colors.primary }]}>Add new address</Text>
          </Pressable>
        </ProfileDetailCard>

        <ProfileDetailCard title="Supported delivery areas">
          <Text style={[styles.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
            Tap an area to add a new address with pincode auto-filled.
          </Text>
          <View style={styles.areaQuickList}>
            {ALLOWED_PINCODES.map((item) => (
              <Pressable
                key={item.pincode}
                onPress={() => {
                  setEditingAddress(null);
                  setForm({ ...EMPTY_FORM, pincode: item.pincode });
                  resetFormState();
                  setSelectedArea(item);
                  setModalVisible(true);
                }}
                style={[styles.areaQuickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.areaQuickPincode, { color: colors.text }]}>{item.pincode}</Text>
                <Text style={[styles.areaQuickLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </ProfileDetailCard>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['bottom']}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingAddress ? 'Edit address' : 'Add address'}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Choose delivery area</Text>
              <PincodeAreaPicker selectedPincode={form.pincode} onSelect={selectArea} />

              {selectedArea ? (
                <View style={[styles.autoFilledBox, { backgroundColor: colors.wallet, borderColor: colors.primary }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <View style={styles.autoFilledText}>
                    <Text style={[styles.autoFilledLabel, { color: colors.primary }]}>Auto-filled location</Text>
                    <Text style={[styles.autoFilledValue, { color: colors.text }]}>
                      {selectedArea.label} · {selectedArea.pincode}
                    </Text>
                  </View>
                </View>
              ) : null}

              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.md }]}>
                2. Enter your house details
              </Text>

              <View style={[styles.detailsSection, !selectedArea && styles.detailsSectionDisabled]}>
                <FormField label="Address label" colors={colors}>
                  <View style={styles.labelChips}>
                    {LABEL_OPTIONS.map((option) => {
                      const selected = form.label === option;
                      return (
                        <Pressable
                          key={option}
                          disabled={!selectedArea}
                          onPress={() => {
                            setFormError('');
                            setForm((current) => ({ ...current, label: option }));
                          }}
                          style={[
                            styles.labelChip,
                            {
                              backgroundColor: selected ? colors.primary : colors.card,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}>
                          <Text style={[styles.labelChipText, { color: selected ? '#FFFFFF' : colors.text }]}>
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </FormField>

                <FormField label="House / flat / street" colors={colors}>
                  <TextInput
                    value={form.line1}
                    editable={!!selectedArea}
                    onChangeText={(value) => {
                      setFormError('');
                      setForm((current) => ({ ...current, line1: value }));
                    }}
                    placeholder="Flat 12, Green Park Apartments"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />
                </FormField>

                <FormField label="Landmark (optional)" colors={colors}>
                  <TextInput
                    value={form.line2}
                    editable={!!selectedArea}
                    onChangeText={(value) => setForm((current) => ({ ...current, line2: value }))}
                    placeholder="Near main market"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                  />
                </FormField>
              </View>

              {!selectedArea ? (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Select a delivery area above first. Pincode and city will be picked automatically.
                </Text>
              ) : null}

              {formError ? <Text style={[styles.formError, { color: '#B91C1C' }]}>{formError}</Text> : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <Pressable
                onPress={handleSave}
                disabled={saving || !selectedArea}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: saving || !selectedArea ? 0.7 : 1,
                  },
                ]}>
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingAddress ? 'Save changes' : 'Save address'}
                  </Text>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function FormField({
  label,
  colors,
  children,
}: {
  label: string;
  colors: (typeof Colors)['light'];
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  body: { fontSize: 14, lineHeight: 22 },
  activeBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  activeBannerText: { flex: 1, gap: 2 },
  activeLabel: { fontSize: 12, fontWeight: '700' },
  activeValue: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  statusBadge: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  loader: { marginVertical: spacing.lg },
  addressList: { gap: spacing.md },
  addressCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  addressLabel: { fontSize: 15, fontWeight: '700' },
  activePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  activePillText: { fontSize: 10, fontWeight: '800' },
  addressLine: { fontSize: 14, fontWeight: '600' },
  addressMeta: { fontSize: 13 },
  addressActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  addButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addButtonText: { fontSize: 14, fontWeight: '700' },
  areaQuickList: { gap: spacing.sm },
  areaQuickCard: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  areaQuickPincode: { fontSize: 15, fontWeight: '800' },
  areaQuickLabel: { fontSize: 13 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.xs },
  fieldLabel: { fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  autoFilledBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  autoFilledText: { flex: 1, gap: 2 },
  autoFilledLabel: { fontSize: 12, fontWeight: '700' },
  autoFilledValue: { fontSize: 14, fontWeight: '600' },
  detailsSection: {
    gap: spacing.lg,
  },
  detailsSectionDisabled: {
    opacity: 0.55,
  },
  labelChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  labelChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 20,
  },
  formError: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
