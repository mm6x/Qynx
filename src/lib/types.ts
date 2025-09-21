export type FileSystemItem = {
  name: string;
  type: 'file' | 'folder';
  size: number;
  lastModified: number;
  path: string;
};

export type Upload = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
};
