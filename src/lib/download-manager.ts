"use client"

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'error';

export interface DownloadItem {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  downloadedBytes: number;
  status: DownloadStatus;
  speed: number; // bytes per second
  eta: number; // estimated time in seconds
  startTime: number;
  endTime?: number;
  error?: string;
  url?: string;
  abortController?: AbortController;
}

export interface DownloadQueue {
  active: DownloadItem[];
  pending: DownloadItem[];
  completed: DownloadItem[];
  failed: DownloadItem[];
}

export const MAX_CONCURRENT_DOWNLOADS = 3;
export const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for progress tracking
