export type UserRole = 'admin' | 'field_user' | 'viewer';

export type JwtPayload = {
  sub: string;
  role: UserRole;
  siteId: string | null;
  email: string;
};

export type AuthUser = {
  id: string;
  role: UserRole;
  siteId: string | null;
  email: string;
};
