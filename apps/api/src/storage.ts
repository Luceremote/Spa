// Abstracción de storage. Permite cambiar entre disco local y S3-compatible (AWS, R2, MinIO)
// con sólo cambiar la env STORAGE_DRIVER. Tiene una API mínima: putImage / getPublicUrl.

import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "./env.js";

export interface StoredFile {
  url: string;       // URL pública (absoluta si S3, relativa si local)
  key: string;       // nombre/clave única
  size: number;
  mime: string;
}

const LOCAL_DIR = path.resolve(process.cwd(), "uploads");

// Asegurar carpeta local al cargar (no top-level await)
fs.mkdir(LOCAL_DIR, { recursive: true }).catch((e) =>
  console.error("[storage:local] no se pudo crear carpeta:", e)
);

let s3: S3Client | null = null;
if (env.STORAGE_DRIVER === "s3") {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    console.warn("[storage] STORAGE_DRIVER=s3 pero faltan credenciales. Volviendo a 'local'.");
  } else {
    s3 = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: !!env.S3_ENDPOINT, // R2/MinIO normalmente requieren path-style
    });
  }
}

export async function putImage(
  key: string,
  buffer: Buffer,
  mime: string
): Promise<StoredFile> {
  if (s3 && env.STORAGE_DRIVER === "s3") {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mime,
        CacheControl: "public, max-age=604800, immutable",
      })
    );
    const url = env.S3_PUBLIC_URL
      ? `${env.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}`
      : `${env.S3_ENDPOINT?.replace(/\/+$/, "")}/${env.S3_BUCKET}/${key}`;
    return { url, key, size: buffer.length, mime };
  }

  // Local
  const filepath = path.join(LOCAL_DIR, key);
  if (!filepath.startsWith(LOCAL_DIR + path.sep)) {
    throw new Error("Ruta inválida");
  }
  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(filepath, { mode: 0o644 });
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(buffer);
  });
  return { url: `/uploads/${key}`, key, size: buffer.length, mime };
}

export const isS3 = !!s3 && env.STORAGE_DRIVER === "s3";
