'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { renameItem } from '@/app/actions';
import type { FileSystemItem } from '@/lib/types';

export default function RenameItemDialog({
  isOpen,
  setIsOpen,
  item,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: FileSystemItem | null;
}) {
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (item) {
      setNewName(item.name);
    }
  }, [item]);

  const handleRename = async () => {
    if (!item || !newName) return;
    setIsLoading(true);
    try {
      await renameItem(item.path, newName);
      toast({ title: 'Success', description: 'Item renamed successfully.' });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not rename item.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {item.type}</DialogTitle>
          <DialogDescription>
            Enter a new name for "{item.name}".
          </DialogDescription>
        </DialogHeader>
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleRename} disabled={isLoading || !newName || newName === item.name}>
            {isLoading ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
