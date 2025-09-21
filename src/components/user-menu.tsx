"use client";

import { useAuth } from '@/context/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, Settings } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logout();
  };

  const getInitials = (username: string) => {
    return username.charAt(0).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-white/10 dark:hover:bg-slate-800/50 transition-all duration-200 hover:scale-105">
          <Avatar className="h-10 w-10 ring-2 ring-purple-500/20 ring-offset-2 ring-offset-white dark:ring-offset-slate-900">
            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-white/20 dark:border-slate-700/50 shadow-2xl" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-semibold leading-none bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {user.username}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
        <DropdownMenuItem className="hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors duration-200">
          <User className="mr-3 h-4 w-4 text-purple-500" />
          <span className="font-medium">Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors duration-200">
          <Settings className="mr-3 h-4 w-4 text-purple-500" />
          <span className="font-medium">Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200/50 dark:bg-gray-700/50" />
        <DropdownMenuItem
          onClick={handleLogout}
          className="hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors duration-200 text-red-600 dark:text-red-400"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
