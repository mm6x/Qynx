'use client';

import { useState } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldCheck } from 'lucide-react';

export default function PasswordDialog({
  isOpen,
  setIsOpen,
  onSubmit,
  reason,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSubmit: (password: string) => void;
  reason?: string;
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    onSubmit(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password Required</DialogTitle>
          <DialogDescription>
            This file requires a password to download.
          </DialogDescription>
        </DialogHeader>
        {reason && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Security Scan</AlertTitle>
            <AlertDescription>{reason}</AlertDescription>
          </Alert>
        )}
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!password}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
