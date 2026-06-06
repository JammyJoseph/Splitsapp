import { randomBytes } from "crypto";

// Generates a cryptographically secure, URL-safe signing token.
export function generateSigningToken(): string {
  return randomBytes(32).toString("base64url");
}
