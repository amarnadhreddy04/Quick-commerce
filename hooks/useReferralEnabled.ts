import { useCatalog } from '@/context/CatalogContext';

export function useReferralEnabled() {
  const { settings } = useCatalog();
  return settings.referralEnabled ?? true;
}
