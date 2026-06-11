import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { useAdminStore } from '../store/AdminStore';

export default function Customers() {
  const { customers, toggleCustomer } = useAdminStore();

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="View customer accounts, referrals, and wallet balances"
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Referral code</th>
                <th>Referred by</th>
                <th>Referrals</th>
                <th>Wallet</th>
                <th>Orders</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.location}</td>
                  <td>{customer.referralCode ?? '—'}</td>
                  <td>{customer.referredByName ?? '—'}</td>
                  <td>{customer.referralsCount ?? 0}</td>
                  <td>₹{customer.walletBalance.toFixed(2)}</td>
                  <td>{customer.ordersCount}</td>
                  <td>
                    <span className={`badge ${customer.active ? 'green' : 'red'}`}>
                      {customer.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleCustomer(customer.id)}>
                      {customer.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
