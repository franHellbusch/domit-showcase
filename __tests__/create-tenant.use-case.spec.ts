import {
  CreateTenantUseCase,
  type IPasswordHasher,
  type IProvisionTenantPort,
  type CreateTenantInput,
  type ProvisionTenantData,
  type ProvisionTenantResult,
} from "../domain/use-cases/create-tenant.use-case";
import { SlugAlreadyTakenError } from "../domain/errors/slug-already-taken.error";
import { InvalidSlugError } from "../domain/errors/invalid-slug.error";
import { InvalidEmailError } from "../domain/errors/invalid-email.error";
import type { ITenantRepository } from "../domain/repositories/tenant.repository";
import type { Tenant, CreateTenantProps } from "../domain/entities/tenant.entity";
import type { User } from "../domain/entities/user.entity";

// ----------------------------------------------------------------
// In-memory ITenantRepository
// ----------------------------------------------------------------
class InMemoryTenantRepository implements ITenantRepository {
  private tenants: Tenant[] = [];
  private slugsTaken: Set<string> = new Set();

  seedSlug(slug: string): void {
    this.slugsTaken.add(slug);
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.slug === slug) ?? null;
  }

  async findByCustomDomain(domain: string): Promise<Tenant | null> {
    return this.tenants.find((t) => t.customDomain === domain) ?? null;
  }

  async findAll(): Promise<Tenant[]> {
    return [...this.tenants];
  }

  async create(props: CreateTenantProps): Promise<Tenant> {
    const tenant: Tenant = {
      id: props.id,
      slug: props.slug,
      name: props.name,
      createdBy: props.createdBy,
      customDomain: props.customDomain ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.push(tenant);
    return tenant;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return this.slugsTaken.has(slug) || this.tenants.some((t) => t.slug === slug);
  }
}

// ----------------------------------------------------------------
// Fake IProvisionTenantPort
// ----------------------------------------------------------------
class FakeProvisionPort implements IProvisionTenantPort {
  public lastProvisionData: ProvisionTenantData | null = null;

  async provision(data: ProvisionTenantData): Promise<ProvisionTenantResult> {
    this.lastProvisionData = data;

    const tenant: Tenant = {
      id: data.tenantId,
      slug: data.slug,
      name: data.name,
      createdBy: data.createdBy,
      customDomain: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const adminUser: User = {
      id: data.adminUserId,
      tenantId: data.tenantId,
      email: data.adminEmail,
      passwordHash: data.adminPasswordHash,
      role: "ADMIN",
      mustChangePassword: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
      totpSecret: null,
      totpEnabled: false,
      acceptedTermsAt: null,
      acceptedTermsVersion: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    return { tenant, adminUser };
  }
}

// ----------------------------------------------------------------
// Fake IPasswordHasher
// ----------------------------------------------------------------
class FakeHasher implements IPasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------
describe("CreateTenantUseCase", () => {
  let repo: InMemoryTenantRepository;
  let provisionPort: FakeProvisionPort;
  let hasher: FakeHasher;
  let useCase: CreateTenantUseCase;

  const validInput: CreateTenantInput = {
    name: "López Propiedades",
    slug: "lopez-propiedades",
    adminEmail: "admin@lopez.com",
    createdBy: "superadmin-uuid",
  };

  beforeEach(() => {
    repo = new InMemoryTenantRepository();
    provisionPort = new FakeProvisionPort();
    hasher = new FakeHasher();
    useCase = new CreateTenantUseCase(repo, provisionPort, hasher);
  });

  describe("provisioning exitoso", () => {
    it("retorna tenant, adminUser y temporaryPassword", async () => {
      const result = await useCase.execute(validInput);

      expect(result.tenant.slug).toBe("lopez-propiedades");
      expect(result.tenant.name).toBe("López Propiedades");
      expect(result.adminUser.email).toBe("admin@lopez.com");
      expect(result.adminUser.role).toBe("ADMIN");
      expect(result.adminUser.mustChangePassword).toBe(true);
      expect(result.temporaryPassword).toBeTruthy();
      expect(result.temporaryPassword.length).toBe(12);
    });

    it("hashea la contraseña temporal antes de provisionar", async () => {
      const result = await useCase.execute(validInput);

      expect(provisionPort.lastProvisionData).not.toBeNull();
      const provisioned = provisionPort.lastProvisionData!;
      expect(provisioned.adminPasswordHash).toMatch(/^hashed:/);
      expect(provisioned.adminPasswordHash).toBe(`hashed:${result.temporaryPassword}`);
    });

    it("calcula trialEndsAt aproximadamente 30 días desde ahora", async () => {
      const before = new Date();
      await useCase.execute(validInput);
      const after = new Date();

      const provisioned = provisionPort.lastProvisionData!;
      const diffDays =
        (provisioned.trialEndsAt.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThan(29.9);
      expect(diffDays).toBeLessThan(30.1);
      expect(provisioned.trialEndsAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(provisioned.trialEndsAt.getTime()).toBeLessThanOrEqual(after.getTime() + 30 * 86400_000);
    });

    it("genera IDs únicos para tenant y adminUser", async () => {
      await useCase.execute(validInput);
      const provisioned = provisionPort.lastProvisionData!;

      expect(provisioned.tenantId).toBeTruthy();
      expect(provisioned.adminUserId).toBeTruthy();
      expect(provisioned.tenantId).not.toBe(provisioned.adminUserId);
    });

    it("normaliza el email a minúsculas", async () => {
      await useCase.execute({ ...validInput, adminEmail: "Admin@LOPEZ.com" });

      const provisioned = provisionPort.lastProvisionData!;
      expect(provisioned.adminEmail).toBe("admin@lopez.com");
    });

    it("normaliza el slug a minúsculas (TenantSlug VO aplica toLowerCase)", async () => {
      const result = await useCase.execute({ ...validInput, slug: "LOPEZ" });
      expect(result.tenant.slug).toBe("lopez");
    });
  });

  describe("validación de slug", () => {
    it("lanza SlugAlreadyTakenError si el slug ya está en uso", async () => {
      repo.seedSlug("lopez-propiedades");

      await expect(useCase.execute(validInput)).rejects.toThrow(SlugAlreadyTakenError);
    });

    it("lanza InvalidSlugError para slug demasiado corto (menos de 3 chars)", async () => {
      await expect(useCase.execute({ ...validInput, slug: "ab" })).rejects.toThrow(
        InvalidSlugError,
      );
    });

    it("lanza InvalidSlugError para slug con caracteres inválidos", async () => {
      await expect(
        useCase.execute({ ...validInput, slug: "lopez propiedades" }),
      ).rejects.toThrow(InvalidSlugError);
    });

    it("lanza InvalidSlugError para slug reservado", async () => {
      await expect(useCase.execute({ ...validInput, slug: "api" })).rejects.toThrow(
        InvalidSlugError,
      );
    });

    it("lanza InvalidSlugError para slug reservado 'admin'", async () => {
      await expect(useCase.execute({ ...validInput, slug: "admin" })).rejects.toThrow(
        InvalidSlugError,
      );
    });
  });

  describe("validación de email", () => {
    it("lanza InvalidEmailError para email sin formato válido", async () => {
      await expect(
        useCase.execute({ ...validInput, adminEmail: "no-es-un-email" }),
      ).rejects.toThrow(InvalidEmailError);
    });

    it("lanza InvalidEmailError para email sin dominio", async () => {
      await expect(
        useCase.execute({ ...validInput, adminEmail: "admin@" }),
      ).rejects.toThrow(InvalidEmailError);
    });
  });
});
