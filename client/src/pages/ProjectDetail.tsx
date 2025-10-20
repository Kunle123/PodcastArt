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
  const { data: template } = trpc.templates.get.useQuery({ projectId: id! });
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
  const initializeTemplate = trpc.templates.initialize.useMutation();

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

      <div className="flex items-start gap-6 mb-6">
        {/* Podcast Artwork */}
        {project.podcastArtworkUrl && (
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted">
              <img 
                src={project.podcastArtworkUrl} 
                alt={project.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
        
        {/* Project Info */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <p className="text-muted-foreground mb-2">Podcast Artwork Studio</p>
          {project.rssFeedUrl && (
            <p className="text-sm text-muted-foreground">
              RSS Feed: <a href={project.rssFeedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{project.rssFeedUrl}</a>
            </p>
          )}
          {project.podcastArtworkUrl && (
            <p className="text-xs text-muted-foreground mt-1">
              Base Artwork Loaded ✓
            </p>
          )}
        </div>
      </div>

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

            {template ? (
              <div className="space-y-6">
                {/* Template Preview */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Base Artwork with Preview */}
                  <div>
                    <h3 className="font-medium mb-2">Preview with Episode Number</h3>
                    {template.baseArtworkUrl ? (
                      <div className="relative aspect-square w-full bg-muted rounded-lg border-2 border-border overflow-hidden">
                        <img 
                          src={template.baseArtworkUrl} 
                          alt="Base artwork"
                          className="w-full h-full object-contain"
                        />
                        {/* Episode Number Overlay Preview */}
                        <div 
                          className={`absolute flex items-center justify-center ${
                            template.episodeNumberPosition === 'top-left' ? 'top-4 left-4' :
                            template.episodeNumberPosition === 'top-right' ? 'top-4 right-4' :
                            template.episodeNumberPosition === 'bottom-left' ? 'bottom-4 left-4' :
                            template.episodeNumberPosition === 'bottom-right' ? 'bottom-4 right-4' :
                            'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                          }`}
                        >
                          <div 
                            className="px-3 py-2 rounded"
                            style={{
                              backgroundColor: `${template.episodeNumberBgColor}${Math.round((parseFloat(template.episodeNumberBgOpacity || '0.8')) * 255).toString(16).padStart(2, '0')}`,
                            }}
                          >
                            <span 
                              className="font-bold"
                              style={{
                                color: template.episodeNumberColor || '#FFFFFF',
                                fontSize: `${Math.min(parseInt(template.episodeNumberSize || '120') / 4, 48)}px`
                              }}
                            >
                              42
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                          Active
                        </div>
                        <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow-lg">
                          Preview
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-square w-full flex items-center justify-center border-2 border-dashed rounded-lg bg-muted">
                        <p className="text-muted-foreground">No base artwork set</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      This shows how episode "42" would appear with your current settings
                    </p>
                  </div>

                  {/* Template Settings */}
                  <div>
                    <h3 className="font-medium mb-2">Current Settings</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Episode Number:</span>
                        <span className="font-medium">{template.showEpisodeNumber === 'true' ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Position:</span>
                        <span className="font-medium capitalize">{template.episodeNumberPosition?.replace('-', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Font Size:</span>
                        <span className="font-medium">{template.episodeNumberSize}px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Font Color:</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: template.episodeNumberColor || '#FFFFFF' }}
                          />
                          <span className="font-medium">{template.episodeNumberColor}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Background Color:</span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded border" 
                            style={{ backgroundColor: template.episodeNumberBgColor || '#000000' }}
                          />
                          <span className="font-medium">{template.episodeNumberBgColor}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Background Opacity:</span>
                        <span className="font-medium">{(parseFloat(template.episodeNumberBgOpacity || '0.8') * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Navigation:</span>
                        <span className="font-medium">{template.showNavigation === 'true' ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      {template.showNavigation === 'true' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nav Position:</span>
                            <span className="font-medium capitalize">{template.navigationPosition?.replace('-', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nav Style:</span>
                            <span className="font-medium capitalize">{template.navigationStyle}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => navigate(`/project/${id}/template`)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Open Visual Editor
                  </Button>
                  {!template.baseArtworkUrl && project.podcastArtworkUrl && (
                    <Button 
                      variant="outline"
                      onClick={async () => {
                        try {
                          await initializeTemplate.mutateAsync({ projectId: id! });
                          toast.success("Template initialized with podcast artwork");
                          utils.templates.get.invalidate();
                        } catch (error: any) {
                          toast.error(error.message);
                        }
                      }}
                      disabled={initializeTemplate.isPending}
                    >
                      {initializeTemplate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Use Podcast Artwork
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">No template configured yet</p>
                <Button onClick={() => navigate(`/project/${id}/template`)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

