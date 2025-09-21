// This is a simple in-memory store for download tokens.
// In a real-world application, you would replace this with a more persistent
// and scalable solution like Redis, Memcached, or a database.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

type DownloadToken = {
  filePath: string;
  expires: number;
};

const TOKEN_FILE = path.join(process.cwd(), 'download-tokens.json');
const downloadTokens = new Map<string, DownloadToken>();

const EXPIRY_DURATION = 30 * 60 * 1000; // 30 minutes instead of 5

// Load tokens from file on startup
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, 'utf8');
      const tokens = JSON.parse(data);
      for (const [token, tokenData] of Object.entries(tokens)) {
        downloadTokens.set(token, tokenData as DownloadToken);
      }
      console.log(`Loaded ${downloadTokens.size} tokens from file`);
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
}

// Save tokens to file
function saveTokens() {
  try {
    const tokens = Object.fromEntries(downloadTokens);
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

// Load tokens on startup
loadTokens();

export { downloadTokens };

export function createDownloadToken(filePath: string): string {
  const token = crypto.randomBytes(20).toString('hex');
  const expires = Date.now() + EXPIRY_DURATION;
  downloadTokens.set(token, { filePath, expires });

  console.log('Token created:', {
    token: token.substring(0, 8) + '...',
    filePath,
    expires: new Date(expires).toISOString(),
    totalTokens: downloadTokens.size
  });

  // Save to file
  saveTokens();

  return token;
}

export function peekFilePathFromToken(token: string): string | null {
  const tokenData = downloadTokens.get(token);

  const now = Date.now();
  console.log('Token peek:', {
    token: token.substring(0, 8) + '...',
    fullToken: token,
    found: !!tokenData,
    expired: tokenData ? tokenData.expires < now : 'N/A',
    filePath: tokenData?.filePath,
    expiresIn: tokenData ? Math.round((tokenData.expires - now) / 1000) + 's' : 'N/A',
    currentTime: new Date(now).toISOString(),
    totalTokens: downloadTokens.size
  });

  if (!tokenData || tokenData.expires < now) {
    if (tokenData) {
      downloadTokens.delete(token);
      console.log('Token expired and removed');
      // Save to file after deletion
      saveTokens();
    }
    return null;
  }

  return tokenData.filePath;
}

export function consumeDownloadToken(token: string): string | null {
    const tokenData = downloadTokens.get(token);

    if (!tokenData || tokenData.expires < Date.now()) {
        if (tokenData) {
            downloadTokens.delete(token);
            saveTokens();
        }
        return null;
    }

    downloadTokens.delete(token);
    saveTokens();
    return tokenData.filePath;
}

// Clean up expired tokens periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [token, tokenData] of downloadTokens.entries()) {
    if (tokenData.expires < now) {
      downloadTokens.delete(token);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired tokens`);
    saveTokens();
  }
}, 60 * 1000); // Run every minute