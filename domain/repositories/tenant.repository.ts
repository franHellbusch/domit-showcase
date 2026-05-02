import type { Tenant, CreateTenantProps } from "../entities/tenant.entity";
import type { SubscriptionStatus } from "../entities/subscription.entity";

export interface TenantFilters {
  readonly status?: SubscriptionStatus;
}

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByCustomDomain(domain: string): Promise<Tenant | null>;
  findAll(filters?: TenantFilters): Promise<Tenant[]>;
  create(props: CreateTenantProps): Promise<Tenant>;
  existsBySlug(slug: string): Promise<boolean>;
}
