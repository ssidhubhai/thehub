import * as React from 'react';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, Check } from 'lucide-react';
import { Button } from '@/components/primitives';
import { toast } from '@/components/primitives/Toast';
import { cn } from '@/lib/utils';

export interface ImageUploaderProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Robust image uploader supporting:
 * 1. Local device file selection (Click to browse)
 * 2. Drag-and-drop from desktop/phone
 * 3. Fallback URL input
 * 4. Automatic image compression / resizing for swift upload & storage
 */
export function ImageUploader({
  value,
  onChange,
  label = 'Add Image',
  className,
  compact = false,
}: ImageUploaderProps) {
  const [mode, setMode] = React.useState<'device' | 'url'>('device');
  const [urlInput, setUrlInput] = React.useState('');
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Compress & resize image to safe dimensions (< 1200px max, webp/jpeg base64)
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }

    // Limit raw file to 15MB before resizing
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image is too large. Please select an image under 15MB.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        try {
          const maxDim = 1200;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            onChange(e.target?.result as string);
            setIsProcessing(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedDataUrl);
          toast.flame('Image Added', 'Image ready from local device.');
        } catch {
          onChange(e.target?.result as string);
        } finally {
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        toast.error('Could not parse image file');
      };
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      toast.error('Error reading file from device');
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUrlSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
    }
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2 text-left', className)}>
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* If an image is selected/attached */}
      {value ? (
        <div className="relative rounded-xl border border-border bg-card overflow-hidden group">
          <img
            src={value}
            alt="Uploaded preview"
            className="w-full max-h-48 sm:max-h-60 object-contain bg-black/5 dark:bg-black/20"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-md rounded-lg p-1 border border-border shadow-sm">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-[11px] font-mono text-foreground hover:text-flame-500 rounded transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty upload dropzone */
        <div className="space-y-2">
          {/* Toggle between device file & URL */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-flame-500" />
              {label}
            </span>
            <div className="flex items-center gap-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setMode('device')}
                className={cn(
                  'px-2 py-0.5 rounded transition-colors',
                  mode === 'device'
                    ? 'bg-muted text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Local Device
              </button>
              <span className="text-border">|</span>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={cn(
                  'px-2 py-0.5 rounded transition-colors',
                  mode === 'url'
                    ? 'bg-muted text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Web URL
              </button>
            </div>
          </div>

          {mode === 'device' ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-150',
                isDragging
                  ? 'border-flame-500 bg-flame-500/10'
                  : 'border-border/80 hover:border-flame-500/60 bg-muted/20 hover:bg-muted/30'
              )}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted/60 border border-border flex items-center justify-center text-flame-500">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">
                    {isProcessing ? 'Processing image...' : 'Click to choose from your device'}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    or drag & drop here (PNG, JPG, WebP, GIF)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-flame-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="text-xs font-mono shrink-0"
              >
                Add
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
