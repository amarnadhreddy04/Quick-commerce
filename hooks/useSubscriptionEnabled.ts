import { useCatalog } from '@/context/CatalogContext';

export function useSubscriptionEnabled() {
  const { settings } = useCatalog();
  return settings.subscriptionEnabled === true;
}
