import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import ArtworkPreviewEditor, { type ArtworkConfig } from "@/components/ArtworkPreviewEditor";

export default function TemplateEditor() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const projectId = params.id as string;

  const { data: projects } = trpc.projects.list.useQuery();
  const project = projects?.find(p => p.id === projectId);
  const saveTemplateMutation = trpc.templates.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully!");
      setLocation(`/project/${projectId}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  const uploadMutation = trpc.upload.uploadBaseArtwork.useMutation();

  const handleSave = async (config: ArtworkConfig) => {
    try {
      // Upload base artwork to S3
      toast.info('Uploading base artwork...');
      
      const uploadResult = await uploadMutation.mutateAsync({
        projectId,
        fileData: config.baseArtworkUrl,
        fileName: 'base-artwork.png',
        mimeType: 'image/png',
      });

      toast.success('Artwork uploaded successfully!');

      // Save template with S3 URL
      await saveTemplateMutation.mutateAsync({
        projectId,
        name: "Default Template",
        baseArtworkUrl: uploadResult.url,
        showEpisodeNumber: config.showNavigation === 'true' ? 'true' : 'false',
        episodeNumberPosition: config.episodeNumberPosition,
        episodeNumberFont: config.episodeNumberFont,
        episodeNumberSize: config.episodeNumberSize,
        episodeNumberColor: config.episodeNumberColor,
        episodeNumberBgColor: config.episodeNumberBgColor,
        episodeNumberBgOpacity: config.episodeNumberBgOpacity,
        showNavigation: config.showNavigation as 'true' | 'false',
        navigationPosition: config.navigationPosition,
        navigationStyle: config.navigationStyle,
      });
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/project/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
          <h1 className="text-3xl font-bold">{project?.name || "Loading..."}</h1>
          <p className="text-gray-600">Customize your episode artwork template</p>
        </div>

        {/* Editor */}
        <ArtworkPreviewEditor onSave={handleSave} />
      </div>
    </div>
  );
}

