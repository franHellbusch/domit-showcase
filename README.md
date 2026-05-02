# Domit Showcase — Multi-Tenant SaaS Architecture

Slice of a production multi-tenant SaaS for real estate agencies. Demonstrates Clean/Hexagonal architecture with a pure TypeScript domain and atomic tenant provisioning.

`TypeScript 5.8` | `NestJS 11` | `Prisma 6` | `Next.js 15` | `Jest` | `beyond-strict` (noUncheckedIndexedAccess + exactOptionalPropertyTypes)

Live app: https://domit.app

---

## About the project

Domit is a B2B SaaS platform for Argentine real estate agencies. Each agency gets an isolated tenant with its own branding, subdomain, property listings, and lead pipeline. The platform is in production with a real paying client.

The main repository is private — it contains client data and production credentials. This showcase is a slice of the tenant provisioning module extracted specifically for portfolio review. The code here is real production code. It was not written for this showcase.

What you will find in this repo: the `CreateTenant` use case in full, including its domain entities, value objects, repository interfaces (ports), domain errors, and 248 lines of unit tests. No real database needed to run anything.

---

## What this showcase demonstrates

1. **Pure TypeScript domain** — `packages/domain` imports zero NestJS, Prisma, or framework code. Only TypeScript and Node built-ins. Verifiable: `grep -r "@nestjs\|@prisma\|express" packages/domain/src` returns no results. This is the actual package.json: two devDependencies — `typescript` and `@types/node`. That's it.

2. **Value Objects that encode business invariants** — `TenantSlug.create()` enforces format (3–50 chars, lowercase alphanumeric + hyphens) and rejects system-reserved words (`api`, `admin`, `www`, etc.) with typed domain errors. `Email.create()` enforces RFC format. A controller that receives a `TenantSlug` already knows it is valid — the validation lives in the type, not scattered across layers.

3. **Ports & Adapters (real port, not just a label)** — `CreateTenantUseCase` depends on `IProvisionTenantPort`, an interface defined in the domain. In production, a Prisma adapter implements it. In tests, an in-memory stub implements it. The use case does not know which one it gets — and it does not care.

4. **Atomic provisioning** — creating a tenant requires writing to five tables: Tenant, Subscription, TenantConfig, User (ADMIN role), and AuditLog. If any write fails, none of them land. This is enforced via `prisma.$transaction` in the infrastructure adapter. The use case itself handles zero rollback logic — that is the adapter's responsibility.

5. **Unit tests with no database** — 248 lines of Jest tests that exercise the use case end-to-end using in-memory repository stubs. No Docker, no migrations, no environment variables. `npm test` from a clean clone is enough.

---

## Stack

| Layer | Technology |
|---|---|
| Domain | TypeScript 5.8 (pure, no framework) |
| API | NestJS 11 + Prisma 6 |
| Database | PostgreSQL (Railway) |
| Frontend | Next.js 15 App Router |
| Monorepo | Turborepo v2 |
| Tests | Jest |
| Deploy | Railway (API) + Vercel (frontends) |

---

## Showcase structure

```
showcase-staging/
├── domain/
│   ├── entities/
│   │   ├── tenant.entity.ts
│   │   └── subscription.entity.ts
│   ├── value-objects/
│   │   ├── tenant-slug.vo.ts
│   │   └── email.vo.ts
│   ├── repositories/
│   │   ├── tenant.repository.ts        (interface / port)
│   │   └── subscription.repository.ts  (interface / port)
│   ├── errors/
│   │   ├── invalid-slug.error.ts
│   │   ├── invalid-email.error.ts
│   │   └── slug-already-taken.error.ts
│   └── use-cases/
│       └── create-tenant.use-case.ts
└── __tests__/
    └── create-tenant.use-case.spec.ts
```

What was removed from the main repo when extracting this slice: the NestJS module wiring (`tenants.module.ts`), the Prisma concrete repositories (the adapters that implement the port interfaces), the HTTP controllers and DTOs, Swagger decorators, and all cross-module dependencies. The domain layer required no changes — it was already isolated by design.

---

## Running the showcase locally

```bash
git clone [url del showcase]
cd domit-showcase
npm install
npm test
```

No database required. No environment variables required. The tests run entirely against in-memory repository stubs. Everything that touches real infrastructure is behind interfaces that the tests replace.

---

## Key technical decisions

### 1. Domain with zero framework imports

`packages/domain` is vanilla TypeScript. NestJS, Prisma, Express — all of those are infrastructure details. They implement the interfaces the domain defines, not the other way around. This boundary is enforced by the package's `package.json`: it declares no runtime dependencies beyond the Node built-ins.

The practical consequence: you can test every business rule without spinning up the application. The domain's test suite runs in milliseconds. Refactoring the HTTP layer or swapping Prisma for a different ORM does not touch a single domain file.

### 2. Value Objects for business invariants

`TenantSlug` and `Email` are not type aliases or validated strings. They are classes with private constructors. The only way to get an instance is through `TenantSlug.create(raw)` or `Email.create(raw)` — both of which throw typed domain errors (`InvalidSlugError`, `InvalidEmailError`) if the input is invalid.

This means invalid data cannot propagate through the system disguised as a valid type. A function that accepts `TenantSlug` does not need to re-validate — if the value exists, it passed the invariant check at creation time.

### 3. Atomic tenant provisioning

Provisioning a new tenant is not a single insert. It requires creating records across five tables, and they all need to succeed together or not at all. A partial write — a tenant row without a subscription, or a subscription without an ADMIN user — produces inconsistent state that is difficult to detect and painful to recover from.

The solution is `IProvisionTenantPort`: a single interface method `provision(data)` that the domain calls. The Prisma adapter implements this by wrapping all five writes inside `prisma.$transaction`. The use case passes data in, gets back the created tenant and admin user, and has no awareness of transactions or rollback. The infrastructure layer handles durability; the domain layer handles business rules.

---

## What is not shown here (but exists in the main repo)

The provisioning module is one piece of a larger system. What this showcase does not include:

- **Multi-tenant public web**: Next.js 15 ISR per tenant, with dynamic `metadata`, JSON-LD structured data for SEO, and per-tenant custom branding.
- **Backoffice SPA**: full ADMIN and VENDEDOR panels with role-based access control.
- **Custom domain resolution**: tenants can use their own domain (e.g. `propiedades.acme.com`). The platform resolves the tenant from the domain via a DB lookup, with no manual configuration required per domain.
- **CI/CD pipeline**: GitHub Actions, Vercel preview environments per branch, Railway staging and production environments.
- **Rate limiting**: Upstash Redis, applied at the API gateway level per tenant.
- **Image management**: Cloudinary integration for property photo upload, resizing, and CDN delivery.

If you want to see more of the project or coordinate a live demo of the product, reach out.

---

## Author

Francisco Hellbusch

LinkedIn: https://www.linkedin.com/in/fhdeveloper/
