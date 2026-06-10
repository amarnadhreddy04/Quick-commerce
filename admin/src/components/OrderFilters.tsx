import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PERIOD_OPTIONS,
  STATUS_OPTIONS,
  type OrderFilterState,
  type PeriodFilter,
} from '../lib/orderFilters';
import '../components/shared.css';

type Props = {
  filters: OrderFilterState;
  onChange: (filters: OrderFilterState) => void;
  showAdvanced?: boolean;
  showSearch?: boolean;
};

export default function OrderFilters({
  filters,
  onChange,
  showAdvanced = true,
  showSearch = true,
}: Props) {
  const setPeriod = (period: PeriodFilter) => onChange({ ...filters, period });

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <span className="filter-label">Time Period</span>
        <div className="filter-chips">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`filter-chip ${filters.period === option.id ? 'active' : ''}`}
              onClick={() => setPeriod(option.id)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filters.period === 'custom' ? (
        <div className="filter-row">
          <label>
            From
            <input
              type="date"
              value={filters.customFrom}
              onChange={(event) => onChange({ ...filters, customFrom: event.target.value })}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.customTo}
              onChange={(event) => onChange({ ...filters, customTo: event.target.value })}
            />
          </label>
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="filter-row">
          <label>
            Order Status
            <select
              value={filters.status}
              onChange={(event) =>
                onChange({ ...filters, status: event.target.value as OrderFilterState['status'] })
              }>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Payment Method
            <select
              value={filters.paymentMethod}
              onChange={(event) => onChange({ ...filters, paymentMethod: event.target.value })}>
              {PAYMENT_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {method === 'all' ? 'All methods' : method}
                </option>
              ))}
            </select>
          </label>

          <label>
            Payment Status
            <select
              value={filters.paymentStatus}
              onChange={(event) => onChange({ ...filters, paymentStatus: event.target.value })}>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All payment states' : status}
                </option>
              ))}
            </select>
          </label>

          {showSearch ? (
            <label>
              Search
              <input
                value={filters.search}
                onChange={(event) => onChange({ ...filters, search: event.target.value })}
                placeholder="Order ID, customer, slot..."
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="filter-actions">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() =>
            onChange({
              period: 'all',
              customFrom: '',
              customTo: '',
              status: 'all',
              paymentMethod: 'all',
              paymentStatus: 'all',
              search: '',
            })
          }>
          Clear Filters
        </button>
      </div>
    </div>
  );
}
