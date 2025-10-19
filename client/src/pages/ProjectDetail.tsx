import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Download, Loader2, Upload, ExternalLink } from "lucide-react";
import { ArtworkGenerationProgress } from "@/components/ArtworkGenerationProgress";
import { ImportRssDialog } from "@/components/ImportRssDialog";
import { ArtworkPreviewDialog } from "@/components/ArtworkPreviewDialog";
import { RSSFeedUpdateDialog } from "@/components/RSSFeedUpdateDialog";
import { GuidedUploadDialog } from "@/components/GuidedUploadDialog";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery({ id: id! });
  const { data: episodes, refetch: refetchEpisodes } = trpc.episodes.list.useQuery({ projectId: id! });
  const utils = trpc.useUtils();

  // Client-side batch generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRSSFeedDialog, setShowRSSFeedDialog] = useState(false);
  const [showGuidedUpload, setShowGuidedUpload] = useState(false);
  const [previewEpisode, setPreviewEpisode] = useState<any | null>(null);
  const [generationProgress, setGenerationProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    errors: [] as string[],
  });
  const [cancelGeneration, setCancelGeneration] = useState(false);

  const generateSingleArtwork = trpc.artwork.generateSingle.useMutation();

  const handleBatchGeneration = async () => {
    if (!episodes || episodes.length === 0) {
      toast.error("No episodes to generate artwork for");
      return;
    }

    setIsGenerating(true);
    setCancelGeneration(false);
    setGenerationProgress({
      total: episodes.length,
      completed: 0,
      failed: 0,
      errors: [],
    });

    const BATCH_SIZE = 5; // Process 5 episodes at a time
    let completed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
      if (cancelGeneration) {
        toast.info("Generation cancelled");
        break;
      }

      const batch = episodes.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((episode) =>
          generateSingleArtwork.mutateAsync({ episodeId: episode.id })
        )
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          completed++;
        } else {
          failed++;
          const episodeName = batch[index]?.title || `Episode ${i + index + 1}`;
          errors.push(`${episodeName}: ${result.reason?.message || "Unknown error"}`);
        }
      });

      setGenerationProgress({
        total: episodes.length,
        completed,
        failed,
        errors,
      });
    }

    setIsGenerating(false);
    refetchEpisodes();

    if (failed === 0) {
      toast.success(`Successfully generated ${completed} artworks!`);
    } else {
      toast.warning(`Generated ${completed} artworks, ${failed} failed`);
    }
  };

  const importRssMutation = trpc.episodes.importRss.useMutation({
    onSuccess: () => {
      toast.success("RSS feed imported successfully");
      refetchEpisodes();
    },
    onError: (error) => {
      toast.error(`Failed to import RSS feed: ${error.message}`);
    },
  });

  const autoNumberMutation = trpc.episodes.autoNumber.useMutation({
    onSuccess: () => {
      toast.success("Episodes auto-numbered successfully");
      refetchEpisodes();
    },
    onError: (error) => {
      toast.error(`Failed to auto-number episodes: ${error.message}`);
    },
  });

  const downloadZipMutation = trpc.download.generateZip.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.name || "podcast"}-artwork.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("ZIP file downloaded successfully");
    },
    onError: (error) => {
      toast.error(`Failed to generate ZIP: ${error.message}`);
    },
  });

  const handleImportRss = async (rssUrl: string) => {
    await importRssMutation.mutateAsync({ projectId: id!, rssUrl });
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
      <p className="text-muted-foreground mb-6">Podcast Artwork Studio</p>

      <Tabs defaultValue="episodes">
        <TabsList>
          <TabsTrigger value="episodes">Episodes</TabsTrigger>
          <TabsTrigger value="template">Template</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="space-y-6">
          {(isGenerating || generationProgress.completed > 0) && (
            <ArtworkGenerationProgress
              total={generationProgress.total}
              completed={generationProgress.completed}
              failed={generationProgress.failed}
              isGenerating={isGenerating}
              errors={generationProgress.errors}
              onCancel={() => setCancelGeneration(true)}
            />
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Episodes</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {episodes?.length || 0} episodes imported
            </p>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => autoNumberMutation.mutate({ projectId: id! })}
                disabled={!episodes || episodes.length === 0 || autoNumberMutation.isPending}
              >
                {autoNumberMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                # Auto-Number
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                disabled={importRssMutation.isPending}
              >
                {importRssMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Upload className="mr-2 h-4 w-4" />
                Import RSS
              </Button>

              <ImportRssDialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
                onImport={handleImportRss}
              />

              <Button
                onClick={handleBatchGeneration}
                disabled={!episodes || episodes.length === 0 || isGenerating}
              >
                {isGenerating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate Artwork
              </Button>

              <Button
                variant="outline"
                onClick={() => downloadZipMutation.mutate({ projectId: id! })}
                disabled={!episodes || episodes.length === 0 || downloadZipMutation.isPending}
              >
                {downloadZipMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Download className="mr-2 h-4 w-4" />
                Download ZIP
              </Button>

              <Button
                variant="default"
                onClick={() => setShowRSSFeedDialog(true)}
                disabled={!episodes || episodes.length === 0}
              >
                📡 Update RSS Feed
              </Button>

              <Button
                variant="secondary"
                onClick={() => setShowGuidedUpload(true)}
                disabled={!episodes || episodes.length === 0}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Guided Upload
              </Button>
            </div>

            <div className="mt-6 space-y-2">
              {episodes?.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => setPreviewEpisode(episode)}
                >
                  <div>
                    <h3 className="font-medium">{episode.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {episode.episodeNumber ? `Episode ${episode.episodeNumber}` : "No episode number"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {episode.generatedArtworkUrl && (
                      <a
                        href={episode.generatedArtworkUrl}
                        download
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <ArtworkPreviewDialog
              open={!!previewEpisode}
              onOpenChange={(open) => !open && setPreviewEpisode(null)}
              episode={previewEpisode}
            />

            <RSSFeedUpdateDialog
              open={showRSSFeedDialog}
              onOpenChange={setShowRSSFeedDialog}
              projectId={id!}
            />

            <GuidedUploadDialog
              open={showGuidedUpload}
              onOpenChange={setShowGuidedUpload}
              projectId={id!}
            />
          </Card>
        </TabsContent>

        <TabsContent value="template">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Artwork Template</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Customize how episode numbers and navigation indicators appear on your artwork
            </p>

            <Button onClick={() => navigate(`/project/${id}/template`)}>
              <Upload className="mr-2 h-4 w-4" />
              Open Visual Editor
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

