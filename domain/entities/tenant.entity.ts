export interface Tenant {
  readonly id: string;
  readonly slug: string;
  readonly customDomain: string | null;
  readonly name: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateTenantProps {
  id: string;
  slug: string;
  name: string;
  createdBy: string;
  customDomain?: string;
}
