'use client';

import React, { useState, useMemo, useEffect, DragEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  MoreVertical,
  Folder,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  FolderPlus,
  UploadCloud,
  Search,
  ChevronRight,
  Home,
  Trash2,
  Download,
  Edit,
  ArrowUpDown,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MediaViewer } from '@/components/media-viewer';
import { Archive, Eye, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';

import type { FileSystemItem } from '@/lib/types';
import { formatBytes } from '@/lib/utils';
import { useFileUpload } from '@/context/file-upload-provider';
import NewFolderDialog from '@/components/modals/new-folder-dialog';
import RenameItemDialog from '@/components/modals/rename-item-dialog';
import PasswordDialog from '@/components/modals/password-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteItem, prepareDownload, getAuthorizedDownloadUrl } from '@/app/actions';
import DeleteConfirmationDialog from './modals/delete-confirmation-dialog';
import { ThemeToggle } from './theme-toggle';
import { useDownloadManager } from '@/context/download-provider';
import OverwriteConfirmDialog from './modals/overwrite-confirm-dialog';

type SortConfig = {
  key: keyof FileSystemItem;
  direction: 'ascending' | 'descending';
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension!)) return <FileImage className="w-5 h-5" />;
  if (['mp4', 'mov', 'avi', 'mkv'].includes(extension!)) return <FileVideo className="w-5 h-5" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension!)) return <FileArchive className="w-5 h-5" />;
  if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(extension!)) return <FileText className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
};

export default function FileBrowser({
  initialFiles,
  currentPath,
}: {
  initialFiles: FileSystemItem[];
  currentPath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadFiles } = useFileUpload();
  const { toast } = useToast();
  const { addToQueue } = useDownloadManager();

  const [files, setFiles] = useState<FileSystemItem[]>(initialFiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const [isDragging, setIsDragging] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [mediaViewerData, setMediaViewerData] = useState<{
    fileName: string;
    filePath: string;
    fileType: 'image' | 'video';
  } | null>(null);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isOverwriteDialogOpen, setIsOverwriteDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [conflictingFiles, setConflictingFiles] = useState<string[]>([]);

  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [passwordContext, setPasswordContext] = useState<{ filePath: string; reason?: string } | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const sortedFiles = useMemo(() => {
    let sortableFiles = [...filteredFiles];
    sortableFiles.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    return sortableFiles;
  }, [filteredFiles, sortConfig]);

  const handleSort = (key: keyof FileSystemItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleItemClick = (item: FileSystemItem) => {
    if (item.type === 'folder') {
      const newPath = item.path;
      router.push(`/?path=${encodeURIComponent(newPath)}`);
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/?path=' }];
    let current = '';
    for (const part of parts) {
      current += `${part}/`;
      crumbs.push({ name: part, path: `/?path=${encodeURIComponent(current.slice(0, -1))}` });
    }
    return crumbs;
  }, [currentPath]);

  const [dragCounter, setDragCounter] = useState(0);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter <= 0) {
        setIsDragging(false);
        return 0;
      }
      return newCounter;
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
      try {
        e.dataTransfer.clearData();
      } catch (error) {
        // clearData might not be available in some browsers, ignore errors
      }
    }
  };

  const handleFiles = (files: File[]) => {
    // Check for conflicting files
    const existingFileNames = new Set(files.map(f => f.name));
    const conflicts = sortedFiles
      .filter(file => existingFileNames.has(file.name))
      .map(file => file.name);

    if (conflicts.length > 0) {
      // Show overwrite confirmation dialog
      setPendingFiles(files);
      setConflictingFiles(conflicts);
      setIsOverwriteDialogOpen(true);
    } else {
      // No conflicts, upload directly
      uploadFiles(files, currentPath);
    }
  };

  const handleOverwriteConfirm = () => {
    uploadFiles(pendingFiles, currentPath);
    setIsOverwriteDialogOpen(false);
    setPendingFiles([]);
    setConflictingFiles([]);
  };

  const handleOverwriteCancel = () => {
    setIsOverwriteDialogOpen(false);
    setPendingFiles([]);
    setConflictingFiles([]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };
  
  const handleRename = (item: FileSystemItem) => {
    setSelectedItem(item);
    setIsRenameOpen(true);
  };

  const handleDelete = (item: FileSystemItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) {
      console.error('No item selected for deletion');
      return;
    }

    try {
      await deleteItem(selectedItem.path);
      toast({ title: 'Success', description: `Deleted ${selectedItem.name}` });
      router.refresh();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to delete ${selectedItem.name}` });
    } finally {
      setIsDeleteOpen(false);
      setSelectedItem(null);
    }
  };

  const handleDownload = async (item: FileSystemItem) => {
    try {
      addToQueue(item.path, item.name, item.size);
      toast({ title: 'Download Added', description: `${item.name} added to download queue.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add to download queue.' });
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!passwordContext) return;
    try {
      const result = await getAuthorizedDownloadUrl(passwordContext.filePath, password);
      if (result.downloadUrl) {
        window.location.href = result.downloadUrl;
        setIsPasswordOpen(false);
        setPasswordContext(null);
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Authorization Failed', description: 'Incorrect password.' });
    }
  };

  const handleFileSelect = (filePath: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(filePath);
    } else {
      newSelected.delete(filePath);
    }
    setSelectedFiles(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allFilePaths = new Set(sortedFiles.map(file => file.path));
      setSelectedFiles(allFilePaths);
    } else {
      setSelectedFiles(new Set());
    }
  };

  const isFileSelected = (filePath: string) => selectedFiles.has(filePath);
  const isAllSelected = sortedFiles.length > 0 && selectedFiles.size === sortedFiles.length;
  const isSomeSelected = selectedFiles.size > 0 && selectedFiles.size < sortedFiles.length;

  const handleViewMedia = (item: FileSystemItem) => {
    const extension = item.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(extension!);
    const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(extension!);

    if (isImage || isVideo) {
      setMediaViewerData({
        fileName: item.name,
        filePath: item.path,
        fileType: isImage ? 'image' : 'video'
      });
      setIsMediaViewerOpen(true);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0) return;

    console.log('Starting ZIP download for files:', Array.from(selectedFiles));

    if (selectedFiles.size === 1) {
      const filePath = Array.from(selectedFiles)[0];
      const item = sortedFiles.find(f => f.path === filePath);
      if (item) {
        await handleDownload(item);
      }
    } else {
      try {
        console.log('Making ZIP API request...');
        const response = await fetch('/api/download/zip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: Array.from(selectedFiles)
          }),
        });

        console.log('ZIP API response status:', response.status);

        if (response.ok) {
          console.log('ZIP download successful, creating blob...');
          const blob = await response.blob();
          console.log('Blob created, size:', blob.size);

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `selected_files_${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          console.log('ZIP download completed');

          toast({
            title: 'Download Complete',
            description: `Downloaded ${selectedFiles.size} files as ZIP archive.`,
          });
        } else {
          const errorText = await response.text();
          console.error('ZIP API error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      } catch (error) {
        console.error('ZIP download failed:', error);
        toast({
          variant: 'destructive',
          title: 'Download Failed',
          description: `Could not create ZIP archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }
    setSelectedFiles(new Set());
  };

  const handleMediaDownload = () => {
    if (mediaViewerData) {
      const item = sortedFiles.find(f => f.path === mediaViewerData.filePath);
      if (item) {
        handleDownload(item);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-3 sm:p-6 md:p-8 lg:p-10 bg-gradient-to-br from-slate-50/50 to-gray-100/50 dark:from-slate-900/50 dark:to-slate-800/50">
      <Card className="flex-1 flex flex-col relative overflow-hidden backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 dark:border-slate-700/50 shadow-2xl shadow-purple-500/5" onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {isDragging && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-2 border-dashed border-purple-400 rounded-2xl z-10 flex items-center justify-center shadow-2xl">
            <div className="text-center animate-in zoom-in-50 duration-300 px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                <UploadCloud className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Drop files here</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Upload to your secure vault</p>
            </div>
          </div>
        )}
        <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/50 to-gray-50/50 dark:from-slate-800/50 dark:to-slate-700/50">
          <div className="flex-1 w-full">
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">File Vault</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Secure file management system</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-muted-foreground overflow-x-auto">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <ChevronRight className="h-4 w-4 mx-1 sm:mx-2 text-gray-400 flex-shrink-0" />}
                  <Button
                    variant="ghost"
                    className="p-1 h-auto hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 transition-all duration-200 rounded-lg flex-shrink-0 text-xs sm:text-sm"
                    onClick={() => handleBreadcrumbClick(crumb.path)}
                  >
                    {index === 0 ? (
                      <div className="flex items-center space-x-1">
                        <Home className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="font-medium">Home</span>
                      </div>
                    ) : (
                      <span className="font-medium truncate max-w-20 sm:max-w-none">{crumb.name}</span>
                    )}
                  </Button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedFiles.size} selected
                </span>
                <Button
                  onClick={handleDownloadSelected}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-200 rounded-xl px-3 sm:px-4 py-2 h-auto text-xs sm:text-sm"
                >
                  <Archive className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">
                    {selectedFiles.size === 1 ? 'Download' : 'Download ZIP'}
                  </span>
                </Button>
                <Button
                  onClick={() => setSelectedFiles(new Set())}
                  variant="outline"
                  className="bg-white/50 dark:bg-slate-800/50 border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-all duration-200 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 h-auto text-xs sm:text-sm"
                >
                  Clear
                </Button>
              </div>
            )}
            <div className="relative flex-1 sm:flex-auto min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search files..."
                className="pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:border-purple-400 focus:ring-purple-400/20 transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload-input')?.click()}
              className="bg-white/50 dark:bg-slate-800/50 border-gray-200/50 dark:border-gray-600/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 transition-all duration-200 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 h-auto text-xs sm:text-sm"
            >
              <UploadCloud className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <Input id="file-upload-input" type="file" multiple className="hidden" onChange={handleFileInputChange} />
            <Button
              onClick={() => setIsNewFolderOpen(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 rounded-xl px-3 sm:px-4 py-2 h-auto text-xs sm:text-sm"
            >
              <FolderPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">New Folder</span>
            </Button>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                  />
                </TableHead>
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer">
                  <div className="flex items-center">Name <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('size')} className="cursor-pointer hidden sm:table-cell">
                   <div className="flex items-center">Size <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('lastModified')} className="cursor-pointer hidden lg:table-cell">
                   <div className="flex items-center">Modified <ArrowUpDown className="ml-2 h-4 w-4" /></div>
                </TableHead>
                <TableHead className="text-right w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFiles.map((item, index) => (
                <TableRow
                  key={item.name}
                  className={`group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-pink-50/50 dark:hover:from-purple-900/10 dark:hover:to-pink-900/10 transition-all duration-200 border-b border-gray-100/50 dark:border-gray-800/50 animate-in slide-in-from-bottom-2 ${
                    isFileSelected(item.path) ? 'bg-purple-50/30 dark:bg-purple-900/20' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell className="py-3 sm:py-4">
                    <Checkbox
                      checked={isFileSelected(item.path)}
                      onCheckedChange={(checked) => handleFileSelect(item.path, checked as boolean)}
                      className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                  </TableCell>
                  <TableCell className="py-3 sm:py-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center shadow-sm flex-shrink-0">
                        {item.type === 'folder' ? (
                          <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          getFileIcon(item.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200 cursor-pointer block truncate text-sm sm:text-base"
                          onClick={(e) => {
                            e.preventDefault();
                            if (item.type === 'folder') {
                              handleItemClick(item);
                            } else {
                              handleViewMedia(item);
                            }
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </a>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                            {item.type === 'file' ? 'File' : 'Folder'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            {item.type === 'file' ? formatBytes(item.size) : ''}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 lg:hidden">
                            {new Date(item.lastModified).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell py-3 sm:py-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {item.type === 'file' ? formatBytes(item.size) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-3 sm:py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.lastModified).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3 sm:py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-purple-100 dark:hover:bg-purple-900/20 hover:scale-110"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-white/20 dark:border-slate-700/50 shadow-2xl w-48">
                        {item.type === 'file' && (
                          <DropdownMenuItem
                            onClick={() => handleDownload(item)}
                            className="hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-200"
                          >
                            <Download className="mr-3 h-4 w-4 text-purple-500" />
                            <span className="font-medium">Download File</span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleRename(item)}
                          className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200"
                        >
                          <Edit className="mr-3 h-4 w-4 text-blue-500" />
                          <span className="font-medium">Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
                        <DropdownMenuItem
                          className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors duration-200"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="mr-3 h-4 w-4" />
                          <span className="font-medium">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedFiles.length === 0 && (
             <div className="text-center p-8 text-muted-foreground">
                <p>This folder is empty.</p>
             </div>
          )}
        </CardContent>
      </Card>

      <NewFolderDialog
        isOpen={isNewFolderOpen}
        setIsOpen={setIsNewFolderOpen}
        currentPath={currentPath}
      />
      <RenameItemDialog
        isOpen={isRenameOpen}
        setIsOpen={setIsRenameOpen}
        item={selectedItem}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteOpen}
        setIsOpen={setIsDeleteOpen}
        onConfirm={confirmDelete}
        itemName={selectedItem?.name}
      />
      <PasswordDialog
        isOpen={isPasswordOpen}
        setIsOpen={setIsPasswordOpen}
        onSubmit={handlePasswordSubmit}
        reason={passwordContext?.reason}
      />
      {mediaViewerData && (
        <MediaViewer
          isOpen={isMediaViewerOpen}
          onClose={() => setIsMediaViewerOpen(false)}
          fileName={mediaViewerData.fileName}
          filePath={mediaViewerData.filePath}
          fileType={mediaViewerData.fileType}
          onDownload={handleMediaDownload}
        />
      )}
      <OverwriteConfirmDialog
        isOpen={isOverwriteDialogOpen}
        onClose={handleOverwriteCancel}
        onConfirm={handleOverwriteConfirm}
        conflictingFiles={conflictingFiles}
        pendingFilesCount={pendingFiles.length}
      />
    </div>
  );
}
