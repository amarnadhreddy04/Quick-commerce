import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  activateAddress as activateAddressRequest,
  checkDeliveryPincode,
  createAddress as createAddressRequest,
  deleteAddress as deleteAddressRequest,
  fetchAddresses,
  fetchSyncState,
  updateAddress as updateAddressRequest,
} from '@/lib/api';
import { checkPincodeLocally } from '@/lib/deliveryPincodes';
import type { DeliveryAddress } from '@/types';

const ACTIVE_ADDRESS_KEY = 'milkbasket-active-address-id';

type DeliveryStatus = 'loading' | 'available' | 'unavailable';

type AddressInput = {
  label: string;
  line1: string;
  line2?: string;
  pincode: string;
  isDefault?: boolean;
};

type DeliveryAreaContextValue = {
  status: DeliveryStatus;
  message: string;
  areaName: string | null;
  pincode: string | null;
  addresses: DeliveryAddress[];
  activeAddress: DeliveryAddress | null;
  addressesLoading: boolean;
  recheck: () => Promise<void>;
  refreshAddresses: () => Promise<void>;
  selectAddress: (addressId: string) => Promise<void>;
  addAddress: (payload: AddressInput) => Promise<DeliveryAddress>;
  editAddress: (addressId: string, payload: Partial<AddressInput>) => Promise<DeliveryAddress>;
  removeAddress: (addressId: string) => Promise<void>;
};

const DeliveryAreaContext = createContext<DeliveryAreaContextValue | null>(null);

async function verifyPincode(pincode: string) {
  let result = checkPincodeLocally(pincode);
  try {
    result = await checkDeliveryPincode(pincode);
  } catch {
    result = checkPincodeLocally(pincode);
  }
  return result;
}

export function DeliveryAreaProvider({ children }: { children: ReactNode }) {
  const { user, token, refreshUser } = useAuth();
  const [status, setStatus] = useState<DeliveryStatus>('loading');
  const [message, setMessage] = useState('');
  const [areaName, setAreaName] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [activeAddress, setActiveAddress] = useState<DeliveryAddress | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const syncRef = useRef(0);

  const applyAddress = useCallback(async (address: DeliveryAddress | null) => {
    if (!address) {
      setStatus('unavailable');
      setPincode(null);
      setAreaName(null);
      setMessage('Add a delivery address with a supported pincode to continue.');
      return;
    }

    setStatus('loading');
    const result = await verifyPincode(address.pincode);

    if (result.available) {
      setStatus('available');
      setPincode(address.pincode);
      setAreaName(result.label ?? address.areaLabel);
      setMessage('');
      return;
    }

    setStatus('unavailable');
    setPincode(address.pincode);
    setAreaName(result.label ?? address.areaLabel);
    setMessage(
      result.message ??
        "We're currently unable to deliver to this address. Try another saved address."
    );
  }, []);

  const refreshAddresses = useCallback(async () => {
    if (!token) {
      setAddresses([]);
      setActiveAddress(null);
      return;
    }

    setAddressesLoading(true);
    try {
      const { addresses: nextAddresses } = await fetchAddresses(token);
      setAddresses(nextAddresses);

      const storedId = await AsyncStorage.getItem(ACTIVE_ADDRESS_KEY);
      let selected =
        nextAddresses.find((item) => item.id === storedId) ??
        nextAddresses.find((item) => item.isDefault) ??
        nextAddresses[0] ??
        null;

      if (selected) {
        await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, selected.id);
      } else {
        await AsyncStorage.removeItem(ACTIVE_ADDRESS_KEY);
      }

      setActiveAddress(selected);
      await applyAddress(selected);
    } catch {
      setAddresses([]);
      setActiveAddress(null);
      setStatus('unavailable');
      setMessage('Could not load your delivery addresses. Please try again.');
    } finally {
      setAddressesLoading(false);
    }
  }, [applyAddress, token]);

  const recheck = useCallback(async () => {
    if (!user || !token) {
      setStatus('available');
      setMessage('');
      setAreaName(null);
      setPincode(null);
      return;
    }

    await refreshAddresses();
  }, [refreshAddresses, token, user]);

  const selectAddress = useCallback(
    async (addressId: string) => {
      if (!token) return;

      const { address } = await activateAddressRequest(token, addressId);
      await AsyncStorage.setItem(ACTIVE_ADDRESS_KEY, address.id);
      await refreshUser();
      setAddresses((current) =>
        current.map((item) => ({ ...item, isDefault: item.id === address.id }))
      );
      setActiveAddress(address);
      await applyAddress(address);
    },
    [applyAddress, refreshUser, token]
  );

  const addAddress = useCallback(
    async (payload: AddressInput) => {
      if (!token) {
        throw new Error('Please log in to add an address');
      }

      const { address } = await createAddressRequest(token, payload);
      setAddresses((current) => [...current, address]);

      try {
        await refreshAddresses();
      } catch {
        // Address was saved; keep optimistic list if refresh fails.
      }

      if (payload.isDefault || address.isDefault) {
        await selectAddress(address.id);
      }

      return address;
    },
    [refreshAddresses, selectAddress, token]
  );

  const editAddress = useCallback(
    async (addressId: string, payload: Partial<AddressInput>) => {
      if (!token) {
        throw new Error('Please log in to update an address');
      }

      const { address } = await updateAddressRequest(token, addressId, payload);
      setAddresses((current) => current.map((item) => (item.id === addressId ? address : item)));

      try {
        await refreshUser();
        await refreshAddresses();
      } catch {
        // Address was saved; keep optimistic update if refresh fails.
      }

      if (activeAddress?.id === addressId) {
        setActiveAddress(address);
        await applyAddress(address);
      }

      return address;
    },
    [activeAddress?.id, applyAddress, refreshAddresses, refreshUser, token]
  );

  const removeAddress = useCallback(
    async (addressId: string) => {
      if (!token) {
        throw new Error('Please log in to remove an address');
      }

      await deleteAddressRequest(token, addressId);
      await refreshUser();
      await refreshAddresses();
    },
    [refreshAddresses, refreshUser, token]
  );

  useEffect(() => {
    if (!user || !token) {
      setStatus('loading');
      setMessage('');
      setAreaName(null);
      setPincode(null);
      setAddresses([]);
      setActiveAddress(null);
      return;
    }

    refreshAddresses().catch(() => {
      setStatus('unavailable');
      setMessage('Could not verify your delivery address. Please try again.');
    });
  }, [refreshAddresses, token, user]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { state } = await fetchSyncState();
        if (state.areas !== syncRef.current) {
          syncRef.current = state.areas;
          if (activeAddress) {
            await applyAddress(activeAddress);
          }
        }
      } catch {
        // API may be offline during dev restarts
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeAddress, applyAddress]);

  const value = useMemo(
    () => ({
      status,
      message,
      areaName,
      pincode,
      addresses,
      activeAddress,
      addressesLoading,
      recheck,
      refreshAddresses,
      selectAddress,
      addAddress,
      editAddress,
      removeAddress,
    }),
    [
      status,
      message,
      areaName,
      pincode,
      addresses,
      activeAddress,
      addressesLoading,
      recheck,
      refreshAddresses,
      selectAddress,
      addAddress,
      editAddress,
      removeAddress,
    ]
  );

  return <DeliveryAreaContext.Provider value={value}>{children}</DeliveryAreaContext.Provider>;
}

export function useDeliveryArea() {
  const context = useContext(DeliveryAreaContext);
  if (!context) {
    throw new Error('useDeliveryArea must be used within DeliveryAreaProvider');
  }
  return context;
}

export function useDeliveryAreaOptional() {
  return useContext(DeliveryAreaContext);
}
