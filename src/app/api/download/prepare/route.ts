import { NextRequest, NextResponse } from 'next/server';
import { prepareDownload, getAuthorizedDownloadUrl } from '@/app/actions';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Reasonable limit for JSON requests
    },
    responseLimit: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const { filePath, password } = await request.json();

    if (!filePath) {
      console.error('Missing filePath in download prepare request');
      return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
    }

    let result;
    if (password) {
      result = await getAuthorizedDownloadUrl(filePath, password);
    } else {
      result = await prepareDownload(filePath);
    }

    if (result.requiresAuth) {
      return NextResponse.json({ requiresAuth: true, reason: result.reason }, { status: 401 });
    }

    return NextResponse.json({ downloadUrl: result.downloadUrl });
  } catch (error) {
    console.error('Download preparation error:', error);
    return NextResponse.json({ error: 'Failed to prepare download', details: (error as Error).message }, { status: 500 });
  }
}
