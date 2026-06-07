import * as Location from 'expo-location';
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

import { checkDeliveryArea, fetchSyncState } from '@/lib/api';

type DeliveryStatus = 'loading' | 'available' | 'unavailable' | 'permission_denied';

type DeliveryAreaContextValue = {
  status: DeliveryStatus;
  message: string;
  areaName: string | null;
  distanceKm: number | null;
  recheck: () => Promise<void>;
};

const DeliveryAreaContext = createContext<DeliveryAreaContextValue | null>(null);

export function DeliveryAreaProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<DeliveryStatus>('loading');
  const [message, setMessage] = useState('');
  const [areaName, setAreaName] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const syncRef = useRef(0);

  const recheck = useCallback(async () => {
    setStatus('loading');

    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setStatus('permission_denied');
      setMessage('Location permission is required to check delivery availability in your area.');
      setAreaName(null);
      setDistanceKm(null);
      return;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const result = await checkDeliveryArea(
      position.coords.latitude,
      position.coords.longitude
    );

    if (result.available && result.area) {
      setStatus('available');
      setAreaName(result.area.name);
      setDistanceKm(result.area.distanceKm);
      setMessage('');
      return;
    }

    setStatus('unavailable');
    setAreaName(result.nearestArea?.name ?? null);
    setDistanceKm(result.nearestArea?.distanceKm ?? null);
    setMessage(
      result.message ??
        "We're currently unable to deliver to your location. Please try again from a serviceable area."
    );
  }, []);

  useEffect(() => {
    recheck().catch(() => {
      setStatus('unavailable');
      setMessage('Could not verify your delivery location. Please try again.');
    });
  }, [recheck]);

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
      distanceKm,
      recheck,
    }),
    [status, message, areaName, distanceKm, recheck]
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
