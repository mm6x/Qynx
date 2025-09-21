import { NextResponse } from 'next/server';
import { peekFilePathFromToken } from '@/lib/download-token-manager';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing token', { status: 400 });
  }

  const filePath = peekFilePathFromToken(token);

  if (!filePath) {
    return new NextResponse('Invalid or expired token', { status: 403 });
  }

  const fullPath = path.join(UPLOAD_DIR, filePath);

  try {
    const stats = await fsPromises.stat(fullPath);
    const stream = fs.createReadStream(fullPath);
    const filename = path.basename(fullPath);
    const mimeType = mime.lookup(filename) || 'application/octet-stream';

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}
