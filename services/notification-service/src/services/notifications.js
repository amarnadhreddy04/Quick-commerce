import nodemailer from 'nodemailer';

const APP_NAME = 'Milkbasket';

function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

async function createMailTransport() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  const testAccount = await nodemailer.createTestAccount();
  console.log('[Email] Using free Ethereal test account:', testAccount.user);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendWelcomeEmail({ name, email }) {
  const transport = await createMailTransport();
  const from = process.env.SMTP_FROM ?? `"${APP_NAME}" <noreply@milkbasket.com>`;

  const info = await transport.sendMail({
    from,
    to: email,
    subject: `Welcome to ${APP_NAME}!`,
    text: [
      `Hi ${name},`,
      '',
      `Your ${APP_NAME} account has been created successfully.`,
      'You can now order daily essentials for morning delivery.',
      '',
      'Thank you for joining us!',
      `Team ${APP_NAME}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#1B8B4C;">Welcome to ${APP_NAME}!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your account has been created successfully. You can now order milk, bread, eggs, and daily essentials for morning delivery.</p>
        <p style="color:#666;">Thank you for joining us!</p>
        <p><strong>Team ${APP_NAME}</strong></p>
      </div>
    `,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('[Email] Preview URL:', preview);
  }

  return { success: true, previewUrl: preview ?? null };
}

async function sendSmsViaFast2SMS(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return null;

  const digits = phone.replace(/\D/g, '').slice(-10);
  const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      route: 'q',
      message,
      language: 'english',
      numbers: digits,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.return === false) {
    throw new Error(data.message ?? 'Fast2SMS request failed');
  }

  return { provider: 'fast2sms', data };
}

async function sendSmsViaTextBelt(phone, message) {
  const key = process.env.TEXTBELT_API_KEY ?? 'textbelt';
  const response = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message, key }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error ?? 'TextBelt SMS failed');
  }

  return { provider: 'textbelt', data };
}

export async function sendWelcomeSms({ name, phone }) {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    return { success: false, skipped: true, reason: 'No phone number provided' };
  }

  const message = `Welcome to ${APP_NAME}, ${name}! Your account is ready. Order daily essentials before 11 PM for tomorrow morning delivery.`;

  if (process.env.FAST2SMS_API_KEY) {
    const result = await sendSmsViaFast2SMS(formattedPhone, message);
    console.log('[SMS] Sent via Fast2SMS to', formattedPhone);
    return { success: true, ...result };
  }

  if (process.env.ENABLE_TEXTBELT_SMS === 'true') {
    const result = await sendSmsViaTextBelt(formattedPhone, message);
    console.log('[SMS] Sent via TextBelt to', formattedPhone);
    return { success: true, ...result };
  }

  console.log('[SMS] Dev mode — message not sent (configure FAST2SMS_API_KEY):');
  console.log(`  To: ${formattedPhone}`);
  console.log(`  Message: ${message}`);
  return { success: true, devMode: true, phone: formattedPhone, message };
}

export async function sendStockAvailableEmail({ name, email, productName }) {
  const transport = await createMailTransport();
  const from = process.env.SMTP_FROM ?? `"${APP_NAME}" <noreply@milkbasket.com>`;

  const info = await transport.sendMail({
    from,
    to: email,
    subject: `${productName} is back in stock — ${APP_NAME}`,
    text: [
      `Hi ${name},`,
      '',
      `Good news! ${productName} is back in stock on ${APP_NAME}.`,
      'Order before 11 PM for tomorrow morning delivery.',
      '',
      `Team ${APP_NAME}`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#1B8B4C;">Back in stock!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p><strong>${productName}</strong> is available again on ${APP_NAME}. Order before 11 PM for tomorrow morning delivery.</p>
        <p style="color:#666;">Team ${APP_NAME}</p>
      </div>
    `,
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('[Email] Stock notify preview URL:', preview);
  }

  return { success: true, previewUrl: preview ?? null };
}

export async function sendStockAvailableSms({ name, phone, productName }) {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    return { success: false, skipped: true, reason: 'No phone number provided' };
  }

  const message = `Hi ${name}, ${productName} is back in stock on ${APP_NAME}. Order before 11 PM for tomorrow morning delivery.`;

  if (process.env.FAST2SMS_API_KEY) {
    const result = await sendSmsViaFast2SMS(formattedPhone, message);
    console.log('[SMS] Stock notify sent via Fast2SMS to', formattedPhone);
    return { success: true, ...result };
  }

  if (process.env.ENABLE_TEXTBELT_SMS === 'true') {
    const result = await sendSmsViaTextBelt(formattedPhone, message);
    console.log('[SMS] Stock notify sent via TextBelt to', formattedPhone);
    return { success: true, ...result };
  }

  console.log('[SMS] Dev mode — stock notify not sent (configure FAST2SMS_API_KEY):');
  console.log(`  To: ${formattedPhone}`);
  console.log(`  Message: ${message}`);
  return { success: true, devMode: true, phone: formattedPhone, message };
}

export async function sendStockAvailableNotifications({ name, email, phone, productName }) {
  const results = { email: null, sms: null, errors: [] };

  try {
    results.email = await sendStockAvailableEmail({ name, email, productName });
  } catch (error) {
    results.errors.push({ channel: 'email', message: error.message });
    console.error('[Email] Stock notify failed:', error.message);
  }

  try {
    results.sms = await sendStockAvailableSms({ name, phone, productName });
  } catch (error) {
    results.errors.push({ channel: 'sms', message: error.message });
    console.error('[SMS] Stock notify failed:', error.message);
  }

  return results;
}

export async function sendVendorOrderNotification({
  name,
  email,
  phone,
  shopName,
  orderId,
  pincode,
  itemCount,
  wholesaleCost,
  storeType,
}) {
  const transport = await createMailTransport();
  const from = process.env.SMTP_FROM ?? `"${APP_NAME}" <noreply@milkbasket.com>`;
  const storeLabel =
    storeType === 'vegetables'
      ? 'Vegetable Store'
      : storeType === 'milk_bread'
        ? 'Milk & Bread Store'
        : 'General Store';

  const subject = `New packing order ${orderId} — ${shopName}`;
  const text = [
    `Hi ${name},`,
    '',
    `A new order has been assigned to ${shopName} (${storeLabel}).`,
    `Order: ${orderId}`,
    `Pincode: ${pincode ?? '—'}`,
    `Items to pack: ${itemCount}`,
    `Your payout for this task: ₹${wholesaleCost}`,
    '',
    'Please pack the items and mark them ready in your vendor portal.',
    `Team ${APP_NAME}`,
  ].join('\n');

  try {
    const info = await transport.sendMail({
      from,
      to: email || undefined,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;">
        <h2 style="color:#1B8B4C;">New order for ${shopName}</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>A new <strong>${storeLabel}</strong> packing task is waiting.</p>
        <p><strong>Order:</strong> ${orderId}<br/>
        <strong>Pincode:</strong> ${pincode ?? '—'}<br/>
        <strong>Items:</strong> ${itemCount}<br/>
        <strong>Your payout:</strong> ₹${wholesaleCost}</p>
      </div>`,
    });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('[Email] Vendor order preview URL:', preview);
  } catch (error) {
    console.error('[Email] Vendor order notify failed:', error.message);
  }

  const smsMessage = `${shopName}: new order ${orderId} (${itemCount} items, payout ₹${wholesaleCost}). Pack now in Milkbasket vendor portal.`;
  if (phone) {
    try {
      if (process.env.FAST2SMS_API_KEY) {
        await sendSmsViaFast2SMS(phone, smsMessage);
      } else {
        console.log('[SMS] Vendor order dev mode:', smsMessage);
      }
    } catch (error) {
      console.error('[SMS] Vendor order notify failed:', error.message);
    }
  }

  return { success: true };
}

export async function sendRegistrationNotifications({ name, email, phone }) {
  const results = { email: null, sms: null, errors: [] };

  try {
    results.email = await sendWelcomeEmail({ name, email });
  } catch (error) {
    results.errors.push({ channel: 'email', message: error.message });
    console.error('[Email] Failed:', error.message);
  }

  try {
    results.sms = await sendWelcomeSms({ name, phone });
  } catch (error) {
    results.errors.push({ channel: 'sms', message: error.message });
    console.error('[SMS] Failed:', error.message);
  }

  return results;
}
