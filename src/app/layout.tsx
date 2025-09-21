import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FileUploadProvider } from "@/context/file-upload-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { DownloadProvider } from "@/context/download-provider";
import { AuthProvider } from "@/context/auth-provider";
import UploadProgress from "@/components/upload-progress";
import { DownloadManager } from "@/components/download-manager";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Qynx - Secure File Sharing",
  description: "Share files securely with Qynx",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-body h-full antialiased`}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="qynx-ui-theme"
        >
          <AuthProvider>
            <FileUploadProvider>
              <DownloadProvider>
                <div className="h-full w-full">{children}</div>
                <Toaster />
                <UploadProgress />
                <DownloadManager />
              </DownloadProvider>
            </FileUploadProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
