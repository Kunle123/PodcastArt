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
  onImport: (rssUrl: string) => Promise<void>;
}

export function ImportRssDialog({ open, onOpenChange, onImport }: ImportRssDialogProps) {
  const [rssUrl, setRssUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!rssUrl.trim()) return;

    setIsImporting(true);
    try {
      await onImport(rssUrl);
      setRssUrl("");
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

