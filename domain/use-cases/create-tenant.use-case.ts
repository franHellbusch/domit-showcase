import type { ITenantRepository } from "../repositories/tenant.repository";
import type { Tenant } from "../entities/tenant.entity";
import type { User } from "../entities/user.entity";
import { TenantSlug } from "../value-objects/tenant-slug.vo";
import { Email } from "../value-objects/email.vo";
import { SlugAlreadyTakenError } from "../errors/slug-already-taken.error";
import { randomUUID } from "crypto";

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
}

export interface ProvisionTenantData {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly createdBy: string;
  readonly adminUserId: string;
  readonly adminEmail: string;
  readonly adminPasswordHash: string;
  readonly trialEndsAt: Date;
}

export interface ProvisionTenantResult {
  readonly tenant: Tenant;
  readonly adminUser: User;
}

/**
 * IProvisionTenantPort — abstrae la operacion atomica de provisioning.
 * La implementacion de infraestructura la ejecuta en una transaccion de DB:
 *   Tenant + Subscription + TenantConfig + User ADMIN + AuditLog
 */
export interface IProvisionTenantPort {
  provision(data: ProvisionTenantData): Promise<ProvisionTenantResult>;
}

export interface CreateTenantInput {
  readonly name: string;
  readonly slug: string;
  readonly adminEmail: string;
  readonly createdBy: string;
}

export interface CreateTenantOutput {
  readonly tenant: Tenant;
  readonly adminUser: User;
  readonly temporaryPassword: string;
}

/**
 * CreateTenantUseCase — provisiona un nuevo tenant.
 *
 * Reglas:
 * 1. El slug debe cumplir formato y no ser reservado → InvalidSlugError
 * 2. El slug debe ser unico → SlugAlreadyTakenError
 * 3. El email del Admin debe tener formato valido → InvalidEmailError
 * 4. Creacion de Tenant + Subscription (TRIAL, 30d) + TenantConfig + User ADMIN es atomica
 * 5. Se genera contrasena temporal; el Admin debe cambiarla en el primer acceso
 *
 * Solo SUPERADMIN puede ejecutar este caso de uso (el guard lo garantiza en la capa HTTP).
 */
export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly provisionPort: IProvisionTenantPort,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantOutput> {
    const slug = TenantSlug.create(input.slug);
    const email = Email.create(input.adminEmail);

    const slugTaken = await this.tenantRepository.existsBySlug(slug.value);
    if (slugTaken) {
      throw new SlugAlreadyTakenError(slug.value);
    }

    const temporaryPassword = this.generateTempPassword();
    const adminPasswordHash = await this.passwordHasher.hash(temporaryPassword);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const { tenant, adminUser } = await this.provisionPort.provision({
      tenantId: randomUUID(),
      slug: slug.value,
      name: input.name,
      createdBy: input.createdBy,
      adminUserId: randomUUID(),
      adminEmail: email.value,
      adminPasswordHash,
      trialEndsAt,
    });

    return { tenant, adminUser, temporaryPassword };
  }

  private generateTempPassword(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const result: string[] = [];
    for (let i = 0; i < 12; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      result.push(char ?? "A");
    }
    return result.join("");
  }
}
