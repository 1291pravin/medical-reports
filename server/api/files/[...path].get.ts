import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { requireAuth } from '~~/server/utils/auth'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const path = getRouterParam(event, 'path')
  if (!path) {
    throw createError({ statusCode: 400, statusMessage: 'Path required' })
  }

  // Prevent directory traversal
  const normalizedPath = path.replace(/\.\./g, '')
  const fullPath = join(UPLOADS_DIR, normalizedPath)

  if (!fullPath.startsWith(UPLOADS_DIR)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  try {
    const buffer = await fs.readFile(fullPath)
    const ext = fullPath.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    setResponseHeaders(event, {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, max-age=3600',
    })

    return buffer
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }
})
