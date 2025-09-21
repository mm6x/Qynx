"use client"

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface DownloadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  chunks: ChunkInfo[];
  startTime: number;
  endTime?: number;
  speed: number;
  eta: number;
  token?: string;
}

export interface ChunkInfo {
  id: number;
  start: number;
  end: number;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  speed: number;
}

interface DownloadContextType {
  downloads: DownloadItem[];
  addToQueue: (filePath: string, fileName: string, fileSize: number) => void;
  removeFromQueue: (id: string) => void;
  clearCompleted: () => void;
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const MAX_CHUNKS = 4;

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const addToQueue = useCallback(async (filePath: string, fileName: string, fileSize: number) => {
    try {
      // Create download token first
      const tokenResponse = await fetch('/api/download/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to prepare download');
      }

      const { downloadUrl } = await tokenResponse.json();

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const chunkSize = Math.ceil(fileSize / MAX_CHUNKS);
      const chunks: ChunkInfo[] = [];

      for (let i = 0; i < MAX_CHUNKS; i++) {
        const start = i * chunkSize;
        const end = Math.min((i + 1) * chunkSize - 1, fileSize - 1);

        chunks.push({
          id: i,
          start,
          end,
          progress: 0,
          status: 'pending',
          speed: 0,
        });
      }

      const downloadItem: DownloadItem = {
        id,
        name: fileName,
        size: fileSize,
        progress: 0,
        status: 'downloading',
        chunks,
        startTime: Date.now(),
        speed: 0,
        eta: 0,
        token: downloadUrl.split('token=')[1], // Extract token from URL
      };

      setDownloads(prev => [...prev, downloadItem]);

      // Start real chunked download
      startChunkedDownload(id, filePath, downloadItem);
    } catch (error) {
      console.error('Failed to add download to queue:', error);
    }
  }, []);

  const startChunkedDownload = async (downloadId: string, filePath: string, downloadItem: DownloadItem) => {
    if (!downloadItem.token) return;

    const downloadUrl = `/api/download?token=${downloadItem.token}`;

    // Download chunks in parallel
    const chunkPromises = downloadItem.chunks.map(async (chunk, index) => {
      const startByte = chunk.start;
      const endByte = chunk.end;
      const chunkSize = endByte - startByte + 1;

      try {
        updateChunkProgress(downloadId, index, 0, 0, 'downloading');

        const response = await fetch(downloadUrl, {
          headers: {
            'Range': `bytes=${startByte}-${endByte}`,
          },
        });

        if (!response.ok && response.status !== 206) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error('No response body');
        }

        const chunks: Uint8Array[] = [];
        let chunkDownloaded = 0;
        let lastChunkUpdate = Date.now();

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          chunks.push(value);
          chunkDownloaded += value.length;

          const now = Date.now();
          if (now - lastChunkUpdate >= 100) {
            const chunkProgress = (chunkDownloaded / chunkSize) * 100;
            updateChunkProgress(downloadId, index, chunkProgress, 0, 'downloading');

            // Update overall progress
            updateOverallProgress(downloadId);
            lastChunkUpdate = now;
          }
        }

        updateChunkProgress(downloadId, index, 100, 0, 'completed');

        return { index, data: new Uint8Array(await new Blob(chunks).arrayBuffer()) };
      } catch (error) {
        updateChunkProgress(downloadId, index, 0, 0, 'error');
        throw error;
      }
    });

    try {
      const results = await Promise.all(chunkPromises);

      // Combine all chunks into final file
      const totalSize = results.reduce((sum, chunk) => sum + chunk.data.length, 0);
      const finalBuffer = new Uint8Array(totalSize);
      let offset = 0;

      results.sort((a, b) => a.index - b.index).forEach(chunk => {
        finalBuffer.set(chunk.data, offset);
        offset += chunk.data.length;
      });

      // Create download
      const blob = new Blob([finalBuffer]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadItem.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      updateDownloadStatus(downloadId, 'completed');
      updateAllChunksStatus(downloadId, 'completed');

    } catch (error) {
      console.error('Chunked download failed:', error);
      updateDownloadStatus(downloadId, 'error');
      updateAllChunksStatus(downloadId, 'error');
    }
  };

  const updateOverallProgress = (downloadId: string) => {
    setDownloads(prev =>
      prev.map(item => {
        if (item.id === downloadId) {
          const totalProgress = item.chunks.reduce((sum, chunk) => sum + chunk.progress, 0);
          const averageProgress = totalProgress / item.chunks.length;

          const completedChunks = item.chunks.filter(chunk => chunk.status === 'completed').length;
          const totalChunks = item.chunks.length;
          const chunkCompletionBonus = (completedChunks / totalChunks) * 100;

          const finalProgress = Math.min(averageProgress + chunkCompletionBonus, 100);

          return { ...item, progress: finalProgress };
        }
        return item;
      })
    );
  };

  const updateDownloadProgress = (id: string, progress: number, speed: number, eta: number) => {
    setDownloads(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, progress, speed, eta }
          : item
      )
    );
  };

  const updateChunkProgress = (downloadId: string, chunkId: number, progress: number, speed: number, status: ChunkInfo['status']) => {
    setDownloads(prev =>
      prev.map(item =>
        item.id === downloadId
          ? {
              ...item,
              chunks: item.chunks.map(chunk =>
                chunk.id === chunkId
                  ? { ...chunk, progress, speed, status }
                  : chunk
              )
            }
          : item
      )
    );
  };

  const updateAllChunksStatus = (downloadId: string, status: ChunkInfo['status']) => {
    setDownloads(prev =>
      prev.map(item =>
        item.id === downloadId
          ? {
              ...item,
              chunks: item.chunks.map(chunk => ({ ...chunk, status }))
            }
          : item
      )
    );
  };

  const updateDownloadStatus = (id: string, status: DownloadItem['status']) => {
    setDownloads(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status,
              endTime: status === 'completed' ? Date.now() : undefined
            }
          : item
      )
    );
  };

  const removeFromQueue = (id: string) => {
    setDownloads(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setDownloads(prev => prev.filter(item => item.status !== 'completed'));
  };

  const value: DownloadContextType = {
    downloads,
    addToQueue,
    removeFromQueue,
    clearCompleted,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloadManager() {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error('useDownloadManager must be used within a DownloadProvider');
  }
  return context;
}
