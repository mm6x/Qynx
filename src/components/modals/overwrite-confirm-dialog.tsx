'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileWarning } from 'lucide-react';

interface OverwriteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  conflictingFiles: string[];
  pendingFilesCount: number;
}

export default function OverwriteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  conflictingFiles,
  pendingFilesCount,
}: OverwriteConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-white/20 dark:border-slate-700/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
              <FileWarning className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg text-left">File Already Exists</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {conflictingFiles.length === 1 ? (
                  `The file "${conflictingFiles[0]}" already exists in this folder. Do you want to replace it?`
                ) : (
                  `${conflictingFiles.length} files already exist in this folder:`
                )}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {conflictingFiles.length > 1 && (
          <div className="px-6 pb-4">
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3">
              <ul className="text-sm space-y-1">
                {conflictingFiles.map((file) => (
                  <li key={file} className="font-medium text-gray-700 dark:text-gray-300">
                    • {file}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted-foreground mt-3 text-center">
              Do you want to replace these files?
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onClose}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel Upload
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
          >
            Replace Files
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
