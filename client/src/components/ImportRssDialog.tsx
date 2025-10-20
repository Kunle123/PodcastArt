import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ImportRssDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rssUrl: string, clearExisting?: boolean, useSequentialNumbers?: boolean, startNumber?: number) => Promise<void>;
  hasExistingEpisodes?: boolean;
}

export function ImportRssDialog({ open, onOpenChange, onImport }: ImportRssDialogProps) {
  const [rssUrl, setRssUrl] = useState("");
  const [clearExisting, setClearExisting] = useState(false);
  const [numberingMode, setNumberingMode] = useState<'rss' | 'sequential' | 'custom'>('rss');
  const [customStartNumber, setCustomStartNumber] = useState('1');
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!rssUrl.trim()) return;

    setIsImporting(true);
    try {
      const useSequentialNumbers = numberingMode === 'sequential' || numberingMode === 'custom';
      const startNumber = numberingMode === 'custom' ? parseInt(customStartNumber) || 1 : 1;
      
      await onImport(rssUrl, clearExisting, useSequentialNumbers, startNumber);
      setRssUrl("");
      setClearExisting(false);
      setNumberingMode('rss');
      setCustomStartNumber('1');
      onOpenChange(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import RSS Feed</DialogTitle>
          <DialogDescription>
            Enter your podcast RSS feed URL to import all episodes. This will fetch episode titles,
            descriptions, publish dates, and artwork.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="rss-url">RSS Feed URL</Label>
            <Input
              id="rss-url"
              placeholder="https://example.com/podcast/feed.xml"
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isImporting) {
                  handleImport();
                }
              }}
              disabled={isImporting}
            />
            <p className="text-sm text-muted-foreground">
              You can find your RSS feed URL in your podcast hosting platform (Buzzsprout, Spotify,
              Libsyn, etc.)
            </p>
          </div>
          <div className="space-y-4 border-t pt-4">
            <div>
              <Label className="text-sm font-semibold">Import Options</Label>
              
              <div className="flex items-center space-x-2 mt-3">
                <input
                  type="checkbox"
                  id="clear-existing"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                  disabled={isImporting}
                />
                <Label htmlFor="clear-existing" className="text-sm font-normal cursor-pointer">
                  Clear existing episodes and re-import from scratch
                </Label>
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold mb-2 block">Episode Numbering</Label>
              
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="numbering-rss"
                    name="numbering"
                    checked={numberingMode === 'rss'}
                    onChange={() => setNumberingMode('rss')}
                    className="w-4 h-4 mt-0.5"
                    disabled={isImporting}
                  />
                  <div className="flex-1">
                    <Label htmlFor="numbering-rss" className="text-sm font-normal cursor-pointer">
                      Use RSS feed numbers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Keep original episode numbers (e.g., 369, 844, 10182)
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="numbering-sequential"
                    name="numbering"
                    checked={numberingMode === 'sequential'}
                    onChange={() => setNumberingMode('sequential')}
                    className="w-4 h-4 mt-0.5"
                    disabled={isImporting}
                  />
                  <div className="flex-1">
                    <Label htmlFor="numbering-sequential" className="text-sm font-normal cursor-pointer">
                      Sequential from 1
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Number episodes 1, 2, 3, 4...
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="numbering-custom"
                    name="numbering"
                    checked={numberingMode === 'custom'}
                    onChange={() => setNumberingMode('custom')}
                    className="w-4 h-4 mt-0.5"
                    disabled={isImporting}
                  />
                  <div className="flex-1">
                    <Label htmlFor="numbering-custom" className="text-sm font-normal cursor-pointer">
                      Start at custom number
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={customStartNumber}
                        onChange={(e) => setCustomStartNumber(e.target.value)}
                        disabled={isImporting || numberingMode !== 'custom'}
                        className="w-24 h-8"
                        min="1"
                        placeholder="1"
                      />
                      <span className="text-xs text-muted-foreground">
                        (e.g., {customStartNumber}, {parseInt(customStartNumber) + 1}, {parseInt(customStartNumber) + 2}...)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!rssUrl.trim() || isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? "Importing..." : "Import Episodes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

