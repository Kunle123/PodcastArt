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
  onImport: (rssUrl: string, clearExisting?: boolean, useSequentialNumbers?: boolean) => Promise<void>;
  hasExistingEpisodes?: boolean;
}

export function ImportRssDialog({ open, onOpenChange, onImport }: ImportRssDialogProps) {
  const [rssUrl, setRssUrl] = useState("");
  const [clearExisting, setClearExisting] = useState(false);
  const [useSequentialNumbers, setUseSequentialNumbers] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!rssUrl.trim()) return;

    setIsImporting(true);
    try {
      await onImport(rssUrl, clearExisting, useSequentialNumbers);
      setRssUrl("");
      setClearExisting(false);
      setUseSequentialNumbers(false);
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
          <div className="space-y-3 border-t pt-4">
            <Label className="text-sm font-semibold">Import Options</Label>
            
            <div className="flex items-center space-x-2">
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

            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="sequential-numbers"
                checked={useSequentialNumbers}
                onChange={(e) => setUseSequentialNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 mt-0.5"
                disabled={isImporting}
              />
              <div className="flex-1">
                <Label htmlFor="sequential-numbers" className="text-sm font-normal cursor-pointer">
                  Use sequential numbering (1, 2, 3...) instead of RSS feed numbers
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Check this if your RSS feed has high numbers (like 10182) for bonus episodes. 
                  Unchecked, we'll use the exact numbers from your feed.
                </p>
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

