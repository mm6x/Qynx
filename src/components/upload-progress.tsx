'use client';

import { useFileUpload } from '@/context/file-upload-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

export default function UploadProgress() {
  const { uploads, clearCompleted } = useFileUpload();

  if (uploads.length === 0) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div>
          <CardTitle className="text-lg">Uploads</CardTitle>
           <CardDescription>
            {uploads.filter(u => u.status === 'uploading').length} of {uploads.length} files uploading
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={clearCompleted}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 max-h-64 overflow-y-auto">
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div key={upload.id}>
              <div className="flex justify-between items-center text-sm">
                <p className="font-medium truncate max-w-[150px]">{upload.file.name}</p>
                <p className="text-muted-foreground">{formatBytes(upload.file.size)}</p>
                {upload.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {upload.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
              </div>
              <Progress value={upload.progress} className="h-2 mt-1" />
              {upload.status === 'error' && (
                <p className="text-xs text-destructive mt-1">{upload.error}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
