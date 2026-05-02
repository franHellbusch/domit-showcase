export class InvalidEmailError extends Error {
  constructor(email: string) {
    super(`El email "${email}" no tiene un formato válido.`);
    this.name = "InvalidEmailError";
  }
}
