export const TERMS_VERSION = '2026-06-01';

export function validateTermsAcceptance(payload) {
  if (!payload?.acceptedTerms) {
    return 'You must accept the Terms & Conditions to register';
  }
  if (payload.termsVersion && payload.termsVersion !== TERMS_VERSION) {
    return 'Please review and accept the latest Terms & Conditions';
  }
  return null;
}
