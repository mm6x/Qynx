import { NextResponse } from 'next/server';
import archiver from 'archiver';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function POST(request: Request) {
  try {
    console.log('ZIP API called');
    const { files }: { files: string[] } = await request.json();
    console.log('Files to zip:', files);

    if (!files || !Array.isArray(files) || files.length === 0) {
      console.log('No files specified');
      return new NextResponse('No files specified', { status: 400 });
    }

    if (files.length > 50) {
      console.log('Too many files:', files.length);
      return new NextResponse('Too many files selected (max 50)', { status: 400 });
    }

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    const chunks: Buffer[] = [];

    archive.on('data', (chunk) => {
      chunks.push(chunk);
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
    });

    for (const filePath of files) {
      try {
        const fullPath = path.join(UPLOAD_DIR, filePath);

        if (!fullPath.startsWith(UPLOAD_DIR)) {
          return new NextResponse('Invalid file path', { status: 400 });
        }

        const stats = await fsPromises.stat(fullPath);

        if (stats.isFile()) {
          const fileName = path.basename(filePath);
          archive.file(fullPath, { name: fileName });
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    await new Promise<void>((resolve, reject) => {
      archive.on('end', () => resolve());
      archive.on('error', reject);
      
      archive.finalize();
    });

    const zipBuffer = Buffer.concat(chunks);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="selected_files_${Date.now()}.zip"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('ZIP creation error:', error);
    return new NextResponse('Failed to create ZIP archive', { status: 500 });
  }
}
