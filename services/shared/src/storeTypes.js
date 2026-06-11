export const STORE_TYPES = [
  { id: 'general', label: 'General Store' },
  { id: 'vegetables', label: 'Vegetable Store' },
  { id: 'milk_bread', label: 'Milk & Bread Store' },
];

const MILK_BREAD_CATEGORIES = new Set([
  'milk',
  'eggs',
  'bread',
  'dairy',
  'breakfast',
  'beverages',
  'tea-coffee',
]);

const VEGETABLE_CATEGORIES = new Set(['fruits', 'vegetables', 'organic']);

export function resolveStoreType({ storeType, categoryId }) {
  if (storeType && STORE_TYPES.some((entry) => entry.id === storeType)) {
    return storeType;
  }
  if (categoryId && MILK_BREAD_CATEGORIES.has(categoryId)) {
    return 'milk_bread';
  }
  if (categoryId && VEGETABLE_CATEGORIES.has(categoryId)) {
    return 'vegetables';
  }
  return 'general';
}

export function storeTypeLabel(storeType) {
  return STORE_TYPES.find((entry) => entry.id === storeType)?.label ?? storeType;
}
