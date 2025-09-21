'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { Upload } from '@/lib/types';
import { uploadChunk, finalizeUpload } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

type FileUploadContextType = {
  uploads: Upload[];
  uploadFiles: (files: File[], path: string) => void;
  clearCompleted: () => void;
};

const FileUploadContext = createContext<FileUploadContextType | undefined>(undefined);

export const FileUploadProvider = ({ children }: { children: ReactNode }) => {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const { toast } = useToast();

  const uploadFiles = useCallback((files: File[], path: string) => {
    const newUploads: Upload[] = Array.from(files).map(file => ({
      id: uuidv4(),
      file,
      progress: 0,
      status: 'pending',
    }));

    setUploads(prev => [...prev, ...newUploads]);

    newUploads.forEach(upload => {
      _startUpload(upload, path);
    });
  }, []);

  const _startUpload = async (upload: Upload, path: string) => {
    setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'uploading' } : u));
    const file = upload.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('uploadId', upload.id);
        formData.append('chunkIndex', i.toString());

        await uploadChunk(formData);

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, progress } : u));
      }

      await finalizeUpload(upload.id, file.name, path);
      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'completed', progress: 100 } : u));
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setUploads(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error', error: errorMessage } : u));
      toast({
        variant: 'destructive',
        title: `Upload failed for ${file.name}`,
        description: errorMessage,
      });
    }
  };

  const clearCompleted = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status !== 'completed' && u.status !== 'error'));
  }, []);

  return (
    <FileUploadContext.Provider value={{ uploads, uploadFiles, clearCompleted }}>
      {children}
    </FileUploadContext.Provider>
  );
};

export const useFileUpload = () => {
  const context = useContext(FileUploadContext);
  if (context === undefined) {
    throw new Error('useFileUpload must be used within a FileUploadProvider');
  }
  return context;
};
