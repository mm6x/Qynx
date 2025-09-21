"use client"

import React from 'react';
import { useDownloadManager, DownloadItem, ChunkInfo } from '@/context/download-provider';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  X,
  DownloadCloud,
  CheckCircle,
  XCircle,
  Activity,
  Clock
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(1024));
  return `${(bytesPerSecond / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatTime(seconds: number): string {
  if (seconds === 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

function ChunkProgress({ chunk }: { chunk: ChunkInfo }) {
  const getStatusColor = (status: ChunkInfo['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'downloading':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="text-xs font-medium text-gray-600 dark:text-gray-300 w-8">
        #{chunk.id + 1}
      </div>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getStatusColor(chunk.status)}`}
          style={{ width: `${chunk.progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
        {chunk.progress.toFixed(0)}%
      </div>
    </div>
  );
}

function DownloadItemRow({ item }: { item: DownloadItem }) {
  const { removeFromQueue } = useDownloadManager();

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: DownloadItem['status']) => {
    const variants = {
      downloading: 'default',
      completed: 'secondary',
      error: 'destructive',
      pending: 'outline',
    } as const;

    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 dark:border-slate-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(item.status)}
            <span className="font-medium text-sm truncate max-w-48">{item.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(item.status)}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeFromQueue(item.id)}
              className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>{formatBytes(Math.round(item.size * item.progress / 100))} / {formatBytes(item.size)}</span>
          {item.status === 'downloading' && (
            <>
              <span>{formatSpeed(item.speed)}</span>
              <span>ETA: {formatTime(item.eta)}</span>
            </>
          )}
        </div>

        <Progress value={item.progress} className="h-2" />
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Download Chunks (ADM Style):</div>
          <div className="grid grid-cols-2 gap-2">
            {item.chunks.map((chunk) => (
              <ChunkProgress key={chunk.id} chunk={chunk} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DownloadManager() {
  const { downloads, clearCompleted } = useDownloadManager();

  if (downloads.length === 0) {
    return null;
  }

  const activeDownloads = downloads.filter(item => item.status === 'downloading');
  const completedDownloads = downloads.filter(item => item.status === 'completed');
  const failedDownloads = downloads.filter(item => item.status === 'error');

  return (
    <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-md max-h-96 overflow-hidden z-50 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-white/20 dark:border-slate-700/50 shadow-2xl shadow-purple-500/10 rounded-2xl animate-in slide-in-from-right-4 duration-500">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/10 dark:to-pink-900/10">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-white">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25">
            <DownloadCloud className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-semibold truncate">ADM Download Manager</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              {downloads.length} downloads • {activeDownloads.length} active
            </div>
          </div>
        </CardTitle>
        <div className="flex items-center gap-1 sm:gap-2">
          {activeDownloads.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">Downloading</span>
            </div>
          )}
          {completedDownloads.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors duration-200"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 max-h-64 overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-3">
          {downloads.map(item => (
            <DownloadItemRow key={item.id} item={item} />
          ))}
        </div>

        <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-3 sm:p-4 bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-gray-800/50 dark:to-gray-900/50">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Total: {downloads.length}</span>
            <span>Active: {activeDownloads.length}</span>
            <span>Done: {completedDownloads.length}</span>
            {failedDownloads.length > 0 && (
              <span className="text-red-500">Failed: {failedDownloads.length}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
