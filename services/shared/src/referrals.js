import { randomUUID } from 'crypto';

import { queryAll, queryOne, run, transaction } from './db.js';

export function normalizeReferralCode(code) {
  return String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function getReferralSettings() {
  const row = queryOne('SELECT referral_enabled, referral_reward_amount FROM app_settings WHERE id = 1');
  return {
    referralEnabled: row?.referral_enabled !== 0,
    referralRewardAmount: row?.referral_reward_amount ?? 50,
  };
}

export function generateUniqueReferralCode(name) {
  const prefix = String(name ?? 'USER')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}${suffix}`;
    const existing = queryOne('SELECT id FROM users WHERE referral_code = ?', [code]);
    if (!existing) return code;
  }

  return `REF${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function resolveReferrer(code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return queryOne(
    `SELECT * FROM users WHERE referral_code = ? AND role = 'customer' AND active = 1`,
    [normalized]
  );
}

export function ensureUserReferralCode(userId, name) {
  const user = queryOne('SELECT id, referral_code, name FROM users WHERE id = ?', [userId]);
  if (!user || user.referral_code) return user?.referral_code ?? null;

  const code = generateUniqueReferralCode(name ?? user.name);
  run('UPDATE users SET referral_code = ? WHERE id = ?', [code, userId]);
  return code;
}

export function ensureAllCustomerReferralCodes() {
  const rows = queryAll(
    `SELECT id, name FROM users WHERE role = 'customer' AND (referral_code IS NULL OR referral_code = '')`
  );
  rows.forEach((row) => {
    run('UPDATE users SET referral_code = ? WHERE id = ?', [
      generateUniqueReferralCode(row.name),
      row.id,
    ]);
  });
}

export function processReferralSignup({ newUserId, referralCode }) {
  const settings = getReferralSettings();
  const normalized = normalizeReferralCode(referralCode);
  if (!normalized) {
    return { referredByUserId: null, rewardCredited: false };
  }

  const referrer = resolveReferrer(normalized);
  if (!referrer || referrer.id === newUserId) {
    return { referredByUserId: null, rewardCredited: false, error: 'Invalid referral code' };
  }

  run('UPDATE users SET referred_by_user_id = ? WHERE id = ?', [referrer.id, newUserId]);

  let rewardCredited = false;
  if (settings.referralEnabled && settings.referralRewardAmount > 0) {
    transaction(() => {
      run('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?', [
        settings.referralRewardAmount,
        referrer.id,
      ]);
      run(
        `INSERT INTO referrals (id, referrer_user_id, referee_user_id, reward_amount, status, credited_at)
         VALUES (?, ?, ?, ?, 'credited', datetime('now'))`,
        [randomUUID(), referrer.id, newUserId, settings.referralRewardAmount]
      );
    });
    rewardCredited = true;
  } else {
    run(
      `INSERT INTO referrals (id, referrer_user_id, referee_user_id, reward_amount, status)
       VALUES (?, ?, ?, 0, 'registered')`,
      [randomUUID(), referrer.id, newUserId]
    );
  }

  return { referredByUserId: referrer.id, rewardCredited, referrerName: referrer.name };
}

export function getReferralStatsForUser(userId) {
  const user = queryOne('SELECT id, name, referral_code FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const code = user.referral_code ?? ensureUserReferralCode(userId, user.name);
  const settings = getReferralSettings();

  const countRow = queryOne(
    'SELECT COUNT(*) as count FROM users WHERE referred_by_user_id = ?',
    [userId]
  );
  const earnedRow = queryOne(
    `SELECT COALESCE(SUM(reward_amount), 0) as total
     FROM referrals WHERE referrer_user_id = ? AND status = 'credited'`,
    [userId]
  );
  const recent = queryAll(
    `SELECT r.id, r.created_at as createdAt, r.reward_amount as rewardAmount, r.status,
            u.name as refereeName
     FROM referrals r
     JOIN users u ON u.id = r.referee_user_id
     WHERE r.referrer_user_id = ?
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [userId]
  );

  return {
    code,
    referralsCount: countRow?.count ?? 0,
    totalEarned: earnedRow?.total ?? 0,
    rewardPerReferral: settings.referralRewardAmount,
    referralEnabled: settings.referralEnabled,
    recentReferrals: recent.map((row) => ({
      id: row.id,
      refereeName: row.refereeName,
      rewardAmount: row.rewardAmount,
      status: row.status,
      createdAt: row.createdAt,
    })),
  };
}

export function getAdminReferralSummary() {
  const totalRow = queryOne('SELECT COUNT(*) as count FROM referrals');
  const creditedRow = queryOne(
    `SELECT COALESCE(SUM(reward_amount), 0) as total FROM referrals WHERE status = 'credited'`
  );
  const topReferrers = queryAll(
    `SELECT u.id, u.name, u.email, u.referral_code as referralCode,
            COUNT(r.id) as referralsCount,
            COALESCE(SUM(CASE WHEN r.status = 'credited' THEN r.reward_amount ELSE 0 END), 0) as totalEarned
     FROM users u
     JOIN referrals r ON r.referrer_user_id = u.id
     GROUP BY u.id
     ORDER BY referralsCount DESC, totalEarned DESC
     LIMIT 50`
  );
  const recent = queryAll(
    `SELECT r.id, r.created_at as createdAt, r.reward_amount as rewardAmount, r.status,
            referrer.name as referrerName, referrer.referral_code as referrerCode,
            referee.name as refereeName, referee.email as refereeEmail
     FROM referrals r
     JOIN users referrer ON referrer.id = r.referrer_user_id
     JOIN users referee ON referee.id = r.referee_user_id
     ORDER BY r.created_at DESC
     LIMIT 30`
  );

  return {
    totalReferrals: totalRow?.count ?? 0,
    totalRewardsPaid: creditedRow?.total ?? 0,
    topReferrers,
    recentReferrals: recent,
  };
}
