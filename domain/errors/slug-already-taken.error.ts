export class SlugAlreadyTakenError extends Error {
  constructor(slug: string) {
    super(`El slug "${slug}" ya está en uso.`);
    this.name = "SlugAlreadyTakenError";
  }
}
