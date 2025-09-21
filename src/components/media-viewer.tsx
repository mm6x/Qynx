import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  fileType: 'image' | 'video';
  onDownload: () => void;
}

export function MediaViewer({
  isOpen,
  onClose,
  fileName,
  filePath,
  fileType,
  onDownload
}: MediaViewerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen && filePath) {
      setIsLoading(true);
      // Get media token from server
      fetch('/api/media/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      })
        .then(response => response.json())
        .then(data => {
          setDownloadUrl(`/api/media?token=${data.token}`);
        })
        .catch(error => {
          console.error('Failed to get media token:', error);
        });
    }
  }, [isOpen, filePath]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          else onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isFullscreen]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={containerRef}
        className="max-w-6xl max-h-screen p-0 bg-black border-0 overflow-hidden"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{fileName}</DialogTitle>
        </DialogHeader>
        <div
          className="relative w-full h-full bg-black"
          onMouseMove={showControlsTemporarily}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {fileType === 'image' ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={downloadUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => console.error('Failed to load image:', e)}
              />
            </div>
          ) : (
            <div className="relative w-full h-full group">
              {downloadUrl ? (
                <video
                  ref={videoRef}
                  src={downloadUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={(e) => console.error('Failed to load video:', e)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              )}

              {downloadUrl && (
                <>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                  )}

                  {/* Play/Pause Overlay */}
                  <div
                    className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={togglePlay}
                  >
                    <Button
                      size="lg"
                      className="bg-black/50 hover:bg-black/70 text-white border-0 h-20 w-20 rounded-full shadow-2xl backdrop-blur-sm"
                    >
                      {isPlaying ? (
                        <Pause className="h-10 w-10" />
                      ) : (
                        <Play className="h-10 w-10 ml-1" />
                      )}
                    </Button>
                  </div>

                  {/* Top Controls */}
                  <div
                    className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <DialogTitle className="text-white text-lg font-medium truncate pr-4">
                        {fileName}
                      </DialogTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onDownload}
                          className="text-white hover:bg-white/10 h-9 w-9"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleFullscreen}
                          className="text-white hover:bg-white/10 h-9 w-9"
                        >
                          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onClose}
                          className="text-white hover:bg-white/10 h-9 w-9"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Controls */}
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 transition-opacity duration-300 ${
                      showControls ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div
                        className="w-full h-2 bg-white/20 rounded-full cursor-pointer relative"
                        onClick={handleProgressClick}
                      >
                        <div
                          className="h-full bg-white rounded-full transition-all duration-100"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg -ml-2 opacity-0 hover:opacity-100 transition-opacity"
                          style={{ left: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={skipBackward}
                          className="text-white hover:bg-white/10 h-9 px-2"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={togglePlay}
                          className="bg-white text-black hover:bg-white/90 h-9 px-3"
                        >
                          {isPlaying ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 ml-0.5" />
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={skipForward}
                          className="text-white hover:bg-white/10 h-9 px-2"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>

                        {/* Volume Control */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={toggleMute}
                            className="text-white hover:bg-white/10 h-9 w-9 p-0"
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </Button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider"
                          />
                        </div>
                      </div>

                      {/* Time Display */}
                      <div className="text-white text-sm font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
