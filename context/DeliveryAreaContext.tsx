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
import { checkDeliveryPincode, fetchSyncState } from '@/lib/api';
import { checkPincodeLocally } from '@/lib/deliveryPincodes';

const PINCODE_KEY = 'milkbasket-pincode';

type DeliveryStatus = 'loading' | 'available' | 'unavailable';

type DeliveryAreaContextValue = {
  status: DeliveryStatus;
  message: string;
  areaName: string | null;
  pincode: string | null;
  recheck: () => Promise<void>;
};

const DeliveryAreaContext = createContext<DeliveryAreaContextValue | null>(null);

function extractPincode(userPincode?: string | null, location?: string) {
  if (userPincode?.replace(/\D/g, '').length === 6) {
    return userPincode.replace(/\D/g, '');
  }
  const match = location?.match(/(\d{6})\s*$/);
  return match?.[1] ?? null;
}

export function DeliveryAreaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<DeliveryStatus>('loading');
  const [message, setMessage] = useState('');
  const [areaName, setAreaName] = useState<string | null>(null);
  const [pincode, setPincode] = useState<string | null>(null);
  const syncRef = useRef(0);

  const recheck = useCallback(async () => {
    if (!user) {
      setStatus('available');
      setMessage('');
      setAreaName(null);
      setPincode(null);
      return;
    }

    setStatus('loading');

    let userPincode = extractPincode(user?.pincode, user?.location);
    if (!userPincode) {
      userPincode = (await AsyncStorage.getItem(PINCODE_KEY))?.replace(/\D/g, '') ?? null;
    }

    if (!userPincode || userPincode.length !== 6) {
      setStatus('unavailable');
      setPincode(null);
      setAreaName(null);
      setMessage('Delivery pincode not found. Please register with pincode 523201, 522601, or 513255.');
      return;
    }

    let result = checkPincodeLocally(userPincode);
    try {
      result = await checkDeliveryPincode(userPincode);
    } catch {
      result = checkPincodeLocally(userPincode);
    }

    if (result.available) {
      setStatus('available');
      setPincode(userPincode);
      setAreaName(result.label ?? userPincode);
      setMessage('');
      return;
    }

    setStatus('unavailable');
    setPincode(userPincode);
    setAreaName(result.label ?? null);
    setMessage(
      result.message ??
        "We're currently unable to deliver to your location. We serve pincodes 523201, 522601, and 513255."
    );
  }, [user, user?.pincode, user?.location]);

  useEffect(() => {
    if (!user) {
      setStatus('loading');
      setMessage('');
      setAreaName(null);
      setPincode(null);
      return;
    }

    recheck().catch(() => {
      setStatus('unavailable');
      setMessage('Could not verify your delivery pincode. Please try again.');
    });
  }, [user, recheck]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { state } = await fetchSyncState();
        if (state.areas !== syncRef.current) {
          syncRef.current = state.areas;
          await recheck();
        }
      } catch {
        // API may be offline during dev restarts
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [recheck]);

  const value = useMemo(
    () => ({
      status,
      message,
      areaName,
      pincode,
      recheck,
    }),
    [status, message, areaName, pincode, recheck]
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
