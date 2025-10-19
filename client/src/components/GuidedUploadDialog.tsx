import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";

interface GuidedUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function GuidedUploadDialog({ open, onOpenChange, projectId }: GuidedUploadDialogProps) {
  const { data: episodes } = trpc.episodes.list.useQuery({ projectId }, { enabled: open });
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<string>>(new Set());

  const handleToggleComplete = (episodeId: string) => {
    setCompletedEpisodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(episodeId)) {
        newSet.delete(episodeId);
      } else {
        newSet.add(episodeId);
      }
      return newSet;
    });
  };

  const progress = episodes ? (completedEpisodes.size / episodes.length) * 100 : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Guided Artwork Upload</DialogTitle>
          <DialogDescription>
            Follow the steps to upload your generated artwork to your podcast hosting platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
          {/* Left Panel: Artwork Thumbnails */}
          <div className="flex flex-col space-y-4 overflow-y-auto pr-4">
                        <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Generated Artwork</h3>
              <span className="text-sm text-muted-foreground">{completedEpisodes.size} / {episodes?.length || 0} completed</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
                        <div className="space-y-2">
              {episodes?.map((episode) => (
                <Card key={episode.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={episode.generatedArtworkUrl || episode.originalArtworkUrl || ''} alt={episode.title || 'Episode artwork'} className="w-16 h-16 rounded-md object-cover bg-muted" />
                    <div>
                      <h4 className="font-semibold">{episode.title}</h4>
                      <p className="text-sm text-muted-foreground">Episode {episode.episodeNumber}</p>
                    </div>
                  </div>
                                    <div className="flex items-center gap-2">
                    <a href={episode.generatedArtworkUrl || episode.originalArtworkUrl || ''} download={`${episode.title}-artwork.jpg`}><Button variant="ghost" size="icon"><Download className="h-5 w-5" /></Button></a>
                    <Button variant={completedEpisodes.has(episode.id) ? 'secondary' : 'outline'} size="sm" onClick={() => handleToggleComplete(episode.id)}>
                      {completedEpisodes.has(episode.id) ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                      {completedEpisodes.has(episode.id) ? 'Mark as incomplete' : 'Mark as complete'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Panel: Instructions & Platform View */}
          <div className="flex flex-col space-y-4 overflow-y-auto pl-4 border-l">
            <h3 className="text-lg font-semibold">Upload Instructions</h3>
                        <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select your platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spotify">Spotify for Podcasters</SelectItem>
                <SelectItem value="libsyn">Libsyn</SelectItem>
                <SelectItem value="rss.com">RSS.com</SelectItem>
                <SelectItem value="spreaker">Spreaker</SelectItem>
              </SelectContent>
            </Select>

            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h4>Update Artwork in Spotify for Podcasters</h4>
              <ol>
                <li>Open your Spotify for Podcasters dashboard.</li>
                <li>Navigate to the episode you want to update.</li>
                <li>Click the "Edit" button for the episode.</li>
                <li>Scroll down to the "Episode Artwork" section.</li>
                <li>Click "Upload new artwork" and select the downloaded file.</li>
                <li>Save your changes.</li>
              </ol>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

