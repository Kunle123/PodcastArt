import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, ExternalLink } from "lucide-react";

interface ArtworkPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode: {
    title: string;
    episodeNumber: number | null;
    generatedArtworkUrl: string | null;
  } | null;
}

export function ArtworkPreviewDialog({ open, onOpenChange, episode }: ArtworkPreviewDialogProps) {
  if (!episode) return null;

  const handleDownload = () => {
    if (episode.generatedArtworkUrl) {
      window.open(episode.generatedArtworkUrl, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {episode.episodeNumber ? `Episode ${episode.episodeNumber}` : episode.title}
          </DialogTitle>
          <DialogDescription>{episode.title}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {episode.generatedArtworkUrl ? (
            <div className="space-y-4">
              <img
                src={episode.generatedArtworkUrl}
                alt={episode.title}
                className="w-full rounded-lg border"
              />
              <p className="text-sm text-muted-foreground text-center">
                Generated artwork with episode number overlay
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-muted">
              <p className="text-muted-foreground">No artwork generated yet</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {episode.generatedArtworkUrl && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

