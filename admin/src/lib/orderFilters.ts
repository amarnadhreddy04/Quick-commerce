import type { Order, OrderStatus } from '../types';

export type PeriodFilter =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'year'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'all'
  | 'custom';

export type RevenueMode = 'delivered' | 'paid' | 'all_except_cancelled';

export type OrderFilterState = {
  period: PeriodFilter;
  customFrom: string;
  customTo: string;
  status: 'all' | OrderStatus;
  paymentMethod: 'all' | string;
  paymentStatus: 'all' | string;
  search: string;
};

export const PERIOD_OPTIONS: { id: PeriodFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'last90', label: 'Last 90 Days' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom Range' },
];

export const STATUS_OPTIONS: Array<'all' | OrderStatus> = [
  'all',
  'scheduled',
  'processing',
  'delivered',
  'pending_payment',
  'cancelled',
];

export const PAYMENT_METHOD_OPTIONS = ['all', 'cod', 'wallet', 'razorpay', 'demo'] as const;
export const PAYMENT_STATUS_OPTIONS = ['all', 'paid', 'pending', 'cod', 'failed'] as const;

export const defaultOrderFilters: OrderFilterState = {
  period: 'all',
  customFrom: '',
  customTo: '',
  status: 'all',
  paymentMethod: 'all',
  paymentStatus: 'all',
  search: '',
};

export function parseOrderDate(dateStr: string): Date {
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const match = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (match) {
    const rebuilt = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
    if (!Number.isNaN(rebuilt.getTime())) {
      return rebuilt;
    }
  }

  return new Date(0);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function getPeriodRange(
  period: PeriodFilter,
  customFrom = '',
  customTo = ''
): { start: Date; end: Date } | null {
  const now = new Date();

  switch (period) {
    case 'all':
      return null;
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    }
    case 'week':
      return { start: startOfWeek(now), end: endOfDay(now) };
    case 'month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'last7': {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'last30': {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'last90': {
      const start = new Date(now);
      start.setDate(start.getDate() - 89);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    case 'custom': {
      if (!customFrom && !customTo) return null;
      const start = customFrom ? startOfDay(new Date(customFrom)) : new Date(0);
      const end = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
      return { start, end };
    }
    default:
      return null;
  }
}

export function getPeriodLabel(period: PeriodFilter): string {
  return PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? period;
}

export function orderMatchesPeriod(
  order: Order,
  period: PeriodFilter,
  customFrom = '',
  customTo = ''
): boolean {
  const range = getPeriodRange(period, customFrom, customTo);
  if (!range) return true;

  const orderDate = parseOrderDate(order.date);
  return orderDate >= range.start && orderDate <= range.end;
}

export function orderMatchesRevenueMode(order: Order, mode: RevenueMode): boolean {
  if (mode === 'delivered') {
    return order.status === 'delivered';
  }

  if (mode === 'paid') {
    const paymentStatus = (order.paymentStatus ?? 'pending').toLowerCase();
    return paymentStatus === 'paid' || paymentStatus === 'cod' || order.status === 'delivered';
  }

  return order.status !== 'cancelled';
}

export function filterOrders(orders: Order[], filters: OrderFilterState): Order[] {
  const query = filters.search.trim().toLowerCase();

  return orders.filter((order) => {
    if (!orderMatchesPeriod(order, filters.period, filters.customFrom, filters.customTo)) {
      return false;
    }

    if (filters.status !== 'all' && order.status !== filters.status) {
      return false;
    }

    if (
      filters.paymentMethod !== 'all' &&
      (order.paymentMethod ?? '').toLowerCase() !== filters.paymentMethod
    ) {
      return false;
    }

    if (
      filters.paymentStatus !== 'all' &&
      (order.paymentStatus ?? 'pending').toLowerCase() !== filters.paymentStatus
    ) {
      return false;
    }

    if (!query) return true;

    return (
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.deliverySlot.toLowerCase().includes(query)
    );
  });
}

export function calculateRevenue(orders: Order[], mode: RevenueMode = 'delivered'): number {
  return orders
    .filter((order) => orderMatchesRevenueMode(order, mode))
    .reduce((sum, order) => sum + order.total, 0);
}

export function filtersToSearchParams(filters: OrderFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.period !== 'all') params.set('period', filters.period);
  if (filters.customFrom) params.set('from', filters.customFrom);
  if (filters.customTo) params.set('to', filters.customTo);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.paymentMethod !== 'all') params.set('paymentMethod', filters.paymentMethod);
  if (filters.paymentStatus !== 'all') params.set('paymentStatus', filters.paymentStatus);
  if (filters.search) params.set('q', filters.search);
  return params;
}

export function filtersFromSearchParams(params: URLSearchParams): OrderFilterState {
  const period = params.get('period') as PeriodFilter | null;

  return {
    period: PERIOD_OPTIONS.some((option) => option.id === period) ? period! : 'all',
    customFrom: params.get('from') ?? '',
    customTo: params.get('to') ?? '',
    status: (params.get('status') as OrderFilterState['status']) || 'all',
    paymentMethod: params.get('paymentMethod') ?? 'all',
    paymentStatus: params.get('paymentStatus') ?? 'all',
    search: params.get('q') ?? '',
  };
}
