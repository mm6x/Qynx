import { NextResponse } from 'next/server';
import { peekFilePathFromToken, downloadTokens } from '@/lib/download-token-manager';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function parseRange(rangeHeader: string, fileSize: number) {
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
    return null;
  }

  return { start, end };
}

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
    const fileSize = stats.size;
    const filename = path.basename(fullPath);
    const rangeHeader = request.headers.get('range');

    if (rangeHeader) {
      const range = parseRange(rangeHeader, fileSize);

      if (!range) {
        return new NextResponse('Invalid range', { status: 416 });
      }

      const { start, end } = range;
      const chunkSize = end - start + 1;

      const stream = fs.createReadStream(fullPath, { start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Cache-Control': 'no-cache',
        },
      });
    } else {
      const stream = fs.createReadStream(fullPath);

      return new NextResponse(stream as any, {
        headers: {
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        },
      });
    }
  } catch (error) {
    return new NextResponse('File not found', { status: 404 });
  }
}
