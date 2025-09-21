"use client";

import { getFiles } from "@/app/actions";
import FileBrowser from "@/components/file-browser";
import { AuthWrapper } from "@/components/auth-wrapper";
import { UserMenu } from "@/components/user-menu";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FileSystemItem } from '@/lib/types';

function HomeContent() {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get('path') || "";
  const [initialFiles, setInitialFiles] = useState<FileSystemItem[]>([]);

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const files = await getFiles(currentPath);
        setInitialFiles(files);
      } catch (error) {
        console.error('Error loading files:', error);
        setInitialFiles([]);
      }
    };

    loadFiles();
  }, [currentPath]);

  return (
    <main className="h-full bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-gray-200/50 dark:border-gray-800/50">
        <div className="flex h-14 sm:h-16 items-center px-4 sm:px-6">
          <div className="flex-1 flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/25">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Qynx</h1>
            </div>
          </div>
          <UserMenu />
        </div>
      </div>
      <FileBrowser initialFiles={initialFiles} currentPath={currentPath} />
    </main>
  );
}

export default function Home() {
  return (
    <AuthWrapper>
      <Suspense fallback={<div className="h-full flex items-center justify-center">Loading...</div>}>
        <HomeContent />
      </Suspense>
    </AuthWrapper>
  );
}
