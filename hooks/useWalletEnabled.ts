import { useCatalog } from '@/context/CatalogContext';

export function useWalletEnabled() {
  const { settings } = useCatalog();
  return settings.walletEnabled === true;
}
