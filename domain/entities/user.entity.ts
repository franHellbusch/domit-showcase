export type Role = "SUPERADMIN" | "ADMIN" | "VENDEDOR";

export interface User {
  readonly id: string;
  readonly tenantId: string | null;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
  readonly mustChangePassword: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt: Date | null;
  readonly totpSecret: string | null;
  readonly totpEnabled: boolean;
  readonly acceptedTermsAt: Date | null;
  readonly acceptedTermsVersion: string | null;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  readonly name?: string;
}

export interface CreateUserProps {
  id: string;
  tenantId: string | null;
  email: string;
  passwordHash: string;
  role: Role;
  mustChangePassword: boolean;
}
