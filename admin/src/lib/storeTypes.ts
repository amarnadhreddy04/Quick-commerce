export const STORE_TYPES = [
  { id: 'general', label: 'General Store' },
  { id: 'vegetables', label: 'Vegetable Store' },
  { id: 'milk_bread', label: 'Milk & Bread Store' },
] as const;

export type StoreTypeId = (typeof STORE_TYPES)[number]['id'];

export function storeTypeLabel(storeType?: string | null): string {
  return STORE_TYPES.find((entry) => entry.id === storeType)?.label ?? storeType ?? 'General Store';
}
