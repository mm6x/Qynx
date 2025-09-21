import { NextResponse } from 'next/server';
import { createDownloadToken } from '@/lib/download-token-manager';

export async function POST(request: Request) {
  try {
    const { filePath } = await request.json();

    if (!filePath) {
      return new NextResponse('Missing filePath', { status: 400 });
    }

    const token = createDownloadToken(filePath);

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Token creation error:', error);
    return new NextResponse('Failed to create token', { status: 500 });
  }
}
