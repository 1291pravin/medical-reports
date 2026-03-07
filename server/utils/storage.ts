import { promises as fs } from 'node:fs'
import { join, dirname } from 'node:path'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// ─── Storage interface ──────────────────────────────────────────────
// Automatically uses local filesystem or Cloudflare R2
// based on STORAGE_DRIVER env var ("local" | "r2")

function getDriver(): 'local' | 'r2' {
  const config = useRuntimeConfig()
  return (config.storageDriver as 'local' | 'r2') || 'local'
}

// ─── Local filesystem storage ───────────────────────────────────────

const UPLOADS_DIR = join(process.cwd(), 'uploads')

async function ensureDir(filePath: string) {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

async function localUpload(key: string, body: Buffer | Uint8Array, _contentType: string): Promise<string> {
  const fullPath = join(UPLOADS_DIR, key)
  await ensureDir(fullPath)
  await fs.writeFile(fullPath, body)
  // Return a URL path that our file-serving route will handle
  return `/api/files/${key}`
}

async function localGetObject(key: string): Promise<Uint8Array> {
  const fullPath = join(UPLOADS_DIR, key)
  const buffer = await fs.readFile(fullPath)
  return new Uint8Array(buffer)
}

async function localDelete(key: string): Promise<void> {
  const fullPath = join(UPLOADS_DIR, key)
  try {
    await fs.unlink(fullPath)
  } catch {
    // File may not exist, that's ok
  }
}

// ─── R2 (S3-compatible) storage ─────────────────────────────────────

let _s3Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!_s3Client) {
    const config = useRuntimeConfig()
    _s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2AccessKeyId,
        secretAccessKey: config.r2SecretAccessKey,
      },
    })
  }
  return _s3Client
}

async function r2Upload(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  const config = useRuntimeConfig()
  const client = getR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: config.r2BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  if (config.r2PublicUrl) {
    return `${config.r2PublicUrl}/${key}`
  }
  return key
}

async function r2GetObject(key: string): Promise<Uint8Array> {
  const config = useRuntimeConfig()
  const client = getR2Client()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.r2BucketName,
      Key: key,
    }),
  )
  return new Uint8Array(await response.Body!.transformToByteArray())
}

async function r2Delete(key: string): Promise<void> {
  const config = useRuntimeConfig()
  const client = getR2Client()

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.r2BucketName,
      Key: key,
    }),
  )
}

export async function r2GetSignedUrl(key: string): Promise<string> {
  const config = useRuntimeConfig()
  const client = getR2Client()

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.r2BucketName,
      Key: key,
    }),
    { expiresIn: 3600 },
  )
}

// ─── Key extraction ─────────────────────────────────────────────────

/**
 * Extract the storage key from a fileUrl.
 * Local URLs look like: /api/files/documents/memberId/file.pdf
 * R2 URLs look like: https://r2.example.com/documents/memberId/file.pdf
 * Raw keys look like: documents/memberId/file.pdf
 */
export function extractStorageKey(fileUrl: string): string {
  if (fileUrl.startsWith('/api/files/')) {
    return fileUrl.replace('/api/files/', '')
  }
  // For R2 public URLs, extract the path after the domain
  try {
    const url = new URL(fileUrl)
    return url.pathname.replace(/^\//, '')
  } catch {
    // Already a raw key
    return fileUrl
  }
}

// ─── Unified exports ────────────────────────────────────────────────

export async function uploadFile(key: string, body: Buffer | Uint8Array, contentType: string): Promise<string> {
  return getDriver() === 'r2'
    ? r2Upload(key, body, contentType)
    : localUpload(key, body, contentType)
}

export async function getFileObject(key: string): Promise<Uint8Array> {
  return getDriver() === 'r2'
    ? r2GetObject(key)
    : localGetObject(key)
}

export async function deleteFile(key: string): Promise<void> {
  return getDriver() === 'r2'
    ? r2Delete(key)
    : localDelete(key)
}
