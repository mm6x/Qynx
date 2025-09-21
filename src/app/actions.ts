'use server';

import fsPromises from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { FileSystemItem } from '@/lib/types';
import { createDownloadToken, peekFilePathFromToken } from '@/lib/download-token-manager';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, '.tmp');

const safeJoin = (...paths: string[]): string => {
  const finalPath = path.join(...paths);
  if (!finalPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Access denied: Path is outside of the allowed directory.');
  }
  return finalPath;
};

const ensureDir = async (dirPath: string) => {
  try {
    await fsPromises.access(dirPath);
  } catch (error) {
    await fsPromises.mkdir(dirPath, { recursive: true });
  }
};

const getRelativePath = (fullPath: string) => {
  return path.relative(UPLOAD_DIR, fullPath);
}

export async function getFiles(currentPath: string = ''): Promise<FileSystemItem[]> {
  await ensureDir(UPLOAD_DIR);
  const dirPath = safeJoin(UPLOAD_DIR, currentPath);

  const dirents = await fsPromises.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    dirents
      .filter(dirent => !dirent.name.startsWith('.'))
      .map(async (dirent) => {
        const fullPath = path.join(dirPath, dirent.name);
        const stats = await fsPromises.stat(fullPath);
        return {
          name: dirent.name,
          type: dirent.isDirectory() ? 'folder' : 'file',
          size: stats.size,
          lastModified: stats.mtime.getTime(),
          path: getRelativePath(fullPath),
        } as FileSystemItem;
      })
  );
  return files;
}

export async function createFolder(currentPath: string, folderName: string) {
  const schema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
  const validation = schema.safeParse(folderName);
  if (!validation.success) {
    throw new Error('Invalid folder name.');
  }

  const newFolderPath = safeJoin(UPLOAD_DIR, currentPath, validation.data);
  await fsPromises.mkdir(newFolderPath);
  revalidatePath('/');
}

export async function deleteItem(itemPath: string) {
  const fullPath = safeJoin(UPLOAD_DIR, itemPath);
  const stats = await fsPromises.stat(fullPath);
  if (stats.isDirectory()) {
    await fsPromises.rm(fullPath, { recursive: true, force: true });
  } else {
    await fsPromises.unlink(fullPath);
  }
  revalidatePath('/');
}

export async function renameItem(itemPath: string, newName: string) {
  const schema = z.string().min(1).max(100);
  const validation = schema.safeParse(newName);
  if (!validation.success) {
    throw new Error('Invalid name.');
  }

  const oldPath = safeJoin(UPLOAD_DIR, itemPath);
  const newPath = safeJoin(path.dirname(oldPath), validation.data);
  await fsPromises.rename(oldPath, newPath);
  revalidatePath('/');
}

export async function uploadChunk(formData: FormData) {
  await ensureDir(TEMP_DIR);

  const chunk = formData.get('chunk') as File;
  const uploadId = formData.get('uploadId') as string;
  const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);

  const uploadDir = safeJoin(TEMP_DIR, uploadId);
  await ensureDir(uploadDir);

  const chunkPath = path.join(uploadDir, `${chunkIndex}`);
  await fsPromises.writeFile(chunkPath, Buffer.from(await chunk.arrayBuffer()));

  return { success: true };
}

export async function finalizeUpload(uploadId: string, fileName: string, currentPath: string) {
  const uploadDir = safeJoin(TEMP_DIR, uploadId);
  const finalPath = safeJoin(UPLOAD_DIR, currentPath, fileName);

  const files = await fsPromises.readdir(uploadDir);
  files.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const writeStream = fs.createWriteStream(finalPath, { flags: 'w' });
  for (const file of files) {
    const chunkPath = path.join(uploadDir, file);
    const chunkBuffer = await fsPromises.readFile(chunkPath);
    writeStream.write(chunkBuffer);
    await fsPromises.unlink(chunkPath);
  }
  writeStream.end();

  await fsPromises.rmdir(uploadDir);

  revalidatePath('/');
  return { success: true, path: getRelativePath(finalPath) };
}


export async function prepareDownload(filePath: string) {
  const fullPath = safeJoin(UPLOAD_DIR, filePath);
  const filename = path.basename(fullPath);

  const password = process.env.QYNX_PASSWORD;
  if (!password) {
    const token = createDownloadToken(filePath);
    return { requiresAuth: false, downloadUrl: `/api/download?token=${token}` };
  }

  const sensitiveFileTypes = ['.key', '.pem', '.pfx', '.p12', '.doc', '.docx', '.pdf'];
  const isSensitiveFile = sensitiveFileTypes.some(ext => filename.toLowerCase().endsWith(ext));

  if (isSensitiveFile) {
    return { requiresAuth: true, reason: 'This file type requires authentication for security.' };
  }

  const token = createDownloadToken(filePath);
  return { requiresAuth: false, downloadUrl: `/api/download?token=${token}` };
}

export async function getAuthorizedDownloadUrl(filePath: string, passwordAttempt: string) {
  const requiredPassword = process.env.QYNX_PASSWORD;
  if (!requiredPassword || passwordAttempt !== requiredPassword) {
    throw new Error('Invalid password.');
  }

  const token = createDownloadToken(filePath);

  return { downloadUrl: `/api/download?token=${token}` };
}

export async function getDownloadInfoFromToken(token: string): Promise<{ filePath: string } | null> {
  const filePath = peekFilePathFromToken(token);
  if (!filePath) {
    return null;
  }
  return { filePath };
}
