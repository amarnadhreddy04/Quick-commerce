export type PanelRole = 'admin' | 'location_admin' | 'wholesaler';

export type PanelUser = {
  id: string;
  name: string;
  email: string;
  role: PanelRole;
  adminPincode?: string | null;
  wholesalerId?: string | null;
};

export const PANEL_ROLES: PanelRole[] = ['admin', 'location_admin', 'wholesaler'];

export function isPanelRole(role: string): role is PanelRole {
  return PANEL_ROLES.includes(role as PanelRole);
}

export function isSuperAdmin(role: string) {
  return role === 'admin';
}

export function isLocationAdmin(role: string) {
  return role === 'location_admin';
}

export function isWholesaler(role: string) {
  return role === 'wholesaler';
}

export function roleLabel(role: PanelRole) {
  if (role === 'admin') return 'Super Admin';
  if (role === 'location_admin') return 'Location Admin';
  return 'Wholesaler';
}

export function homePathForRole(role: PanelRole) {
  if (role === 'wholesaler') return '/vendor';
  return '/';
}
