/**
 * Local object storage for publish artifacts (PDF, etc.).
 * Layout: {OBJECT_STORAGE_PATH}/{roomId}/{hash}.pdf
 * Future: swap body for S3-compatible put/get with same keys.
 */

import { mkdir, writeFile, readFile, unlink, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from '../config.js';

function baseDir(): string {
  return config.objectStoragePath;
}

export function objectKey(roomId: string, hash: string, ext = 'pdf'): string {
  const safeRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeHash = hash.replace(/[^a-fA-F0-9]/g, '').slice(0, 64) || 'unknown';
  return `${safeRoom}/${safeHash}.${ext}`;
}

export function objectPath(key: string): string {
  return join(baseDir(), key);
}

export async function putObject(key: string, data: Buffer, contentType?: string): Promise<string> {
  const path = objectPath(key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  // contentType reserved for S3 metadata
  void contentType;
  return key;
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(objectPath(key));
  } catch {
    return null;
  }
}

export async function hasObject(key: string): Promise<boolean> {
  try {
    await access(objectPath(key));
    return true;
  } catch {
    return false;
  }
}

export async function deleteObject(key: string): Promise<boolean> {
  try {
    await unlink(objectPath(key));
    return true;
  } catch {
    return false;
  }
}
