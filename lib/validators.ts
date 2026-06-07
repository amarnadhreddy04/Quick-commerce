const NAME_PATTERN = /^[A-Za-z\s]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeName(value: string) {
  return value.replace(/[^A-Za-z\s]/g, '');
}

export function sanitizePhone(value: string) {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function validateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < 2) return 'Enter at least 2 letters in your name';
  if (!NAME_PATTERN.test(trimmed)) return 'Name can contain only letters and spaces';
  return null;
}

export function validateEmail(email: string) {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function validatePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (digits.length !== 10) return 'Enter a valid 10-digit phone number';
  return null;
}

export function sanitizePincode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export function validatePincode(pincode: string) {
  const digits = pincode.replace(/\D/g, '');
  if (!digits) return 'Pincode is required';
  if (digits.length !== 6) return 'Enter a valid 6-digit pincode';
  return null;
}
