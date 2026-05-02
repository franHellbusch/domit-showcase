import { InvalidSlugError } from "../errors/invalid-slug.error";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "superadmin",
  "app",
  "www",
  "mail",
  "support",
  "help",
  "login",
  "auth",
  "static",
]);

export class TenantSlug {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): TenantSlug {
    const value = raw.trim().toLowerCase();

    if (!SLUG_REGEX.test(value)) {
      throw new InvalidSlugError(
        `El slug "${value}" no es valido. Debe tener entre 3 y 50 caracteres (letras minusculas, numeros y guiones).`
      );
    }

    if (RESERVED_SLUGS.has(value)) {
      throw new InvalidSlugError(
        `El slug "${value}" es una palabra reservada del sistema.`
      );
    }

    return new TenantSlug(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: TenantSlug): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
