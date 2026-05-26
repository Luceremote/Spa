// 2FA TOTP. Cifrado simétrico opcional para el secret en reposo.
import { authenticator } from "otplib";
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../env.js";

authenticator.options = { window: 1, step: 30 };

function key(): Buffer | null {
  if (!env.TOTP_ENCRYPTION_KEY) return null;
  // Derivamos una clave de 32 bytes a partir del secret (scrypt es lento → caché)
  return scryptSync(env.TOTP_ENCRYPTION_KEY, "spa-totp-salt", 32);
}

export function encryptSecret(secret: string): string {
  const k = key();
  if (!k) return secret; // sin cifrado
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith("v1:")) return stored; // legacy / sin cifrar
  const k = key();
  if (!k) throw new Error("TOTP_ENCRYPTION_KEY requerido para descifrar");
  const [, ivB64, tagB64, dataB64] = stored.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", k, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(secret: string, account: string, issuer: string): string {
  return authenticator.keyuri(account, issuer, secret);
}

export function verifyTotp(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

// Códigos de recuperación: se generan en plano (mostrados una sola vez) y se guardan como bcrypt.
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
}

export async function consumeRecoveryCode(
  inputCode: string,
  storedHashes: string[]
): Promise<{ valid: boolean; remaining: string[] }> {
  const normalized = inputCode.trim().toUpperCase();
  for (let i = 0; i < storedHashes.length; i++) {
    if (await bcrypt.compare(normalized, storedHashes[i]!)) {
      const remaining = [...storedHashes.slice(0, i), ...storedHashes.slice(i + 1)];
      return { valid: true, remaining };
    }
  }
  return { valid: false, remaining: storedHashes };
}

// Hash de chequeo rápido para comparaciones constantes
export function fingerprint(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
