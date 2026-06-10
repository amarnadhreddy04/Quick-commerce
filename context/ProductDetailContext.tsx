import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import ProductDetailModal from '@/components/ProductDetailModal';
import type { Product } from '@/types';

type ProductDetailContextValue = {
  openProduct: (product: Product) => void;
  closeProduct: () => void;
};

const ProductDetailContext = createContext<ProductDetailContextValue | null>(null);

export function ProductDetailProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);

  const openProduct = useCallback((item: Product) => {
    setProduct(item);
  }, []);

  const closeProduct = useCallback(() => {
    setProduct(null);
  }, []);

  const value = useMemo(
    () => ({
      openProduct,
      closeProduct,
    }),
    [openProduct, closeProduct]
  );

  return (
    <ProductDetailContext.Provider value={value}>
      {children}
      <ProductDetailModal product={product} onClose={closeProduct} />
    </ProductDetailContext.Provider>
  );
}

export function useProductDetail() {
  const context = useContext(ProductDetailContext);
  if (!context) {
    throw new Error('useProductDetail must be used within ProductDetailProvider');
  }
  return context;
}
