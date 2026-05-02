import { InvalidEmailError } from "../errors/invalid-email.error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();

    if (!EMAIL_REGEX.test(value)) {
      throw new InvalidEmailError(value);
    }

    return new Email(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
