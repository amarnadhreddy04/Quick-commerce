import { useEffect, useState } from 'react';

import PageHeader from '../components/PageHeader';
import '../components/shared.css';
import { api } from '../lib/api';

type ReferralSummary = {
  totalReferrals: number;
  totalRewardsPaid: number;
  topReferrers: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
    referralsCount: number;
    totalEarned: number;
  }[];
  recentReferrals: {
    id: string;
    createdAt: string;
    rewardAmount: number;
    status: string;
    referrerName: string;
    referrerCode: string;
    refereeName: string;
    refereeEmail: string;
  }[];
};

export default function ReferralsPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReferralSummary()
      .then((response) => setSummary(response.summary as ReferralSummary))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading referrals...</div>;
  }

  if (error || !summary) {
    return (
      <div>
        <PageHeader title="Referrals" subtitle={error || 'Failed to load referral data'} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Referrals"
        subtitle="Track sign-ups through customer referral codes and rewards paid"
      />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span>Total referrals</span>
          <strong>{summary.totalReferrals}</strong>
        </div>
        <div className="stat-card">
          <span>Rewards paid</span>
          <strong>₹{summary.totalRewardsPaid}</strong>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">Top referrers</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Referral code</th>
                <th>Friends joined</th>
                <th>Earned</th>
              </tr>
            </thead>
            <tbody>
              {summary.topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={4}>No referrals yet.</td>
                </tr>
              ) : (
                summary.topReferrers.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{row.email}</div>
                    </td>
                    <td>{row.referralCode}</td>
                    <td>{row.referralsCount}</td>
                    <td>₹{row.totalEarned}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Recent referral sign-ups</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Referred by</th>
                <th>New customer</th>
                <th>Reward</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentReferrals.length === 0 ? (
                <tr>
                  <td colSpan={5}>No referral sign-ups yet.</td>
                </tr>
              ) : (
                summary.recentReferrals.map((row) => (
                  <tr key={row.id}>
                    <td>{row.createdAt?.slice(0, 10) ?? '—'}</td>
                    <td>
                      {row.referrerName}
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{row.referrerCode}</div>
                    </td>
                    <td>
                      {row.refereeName}
                      <div style={{ fontSize: 12, color: '#6B7280' }}>{row.refereeEmail}</div>
                    </td>
                    <td>{row.rewardAmount > 0 ? `₹${row.rewardAmount}` : '—'}</td>
                    <td>
                      <span className={`badge ${row.status === 'credited' ? 'green' : 'yellow'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
