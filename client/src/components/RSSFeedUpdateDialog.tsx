import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Copy, Download, CheckCircle, Loader2, ExternalLink } from "lucide-react";

interface RSSFeedUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function RSSFeedUpdateDialog({ open, onOpenChange, projectId }: RSSFeedUpdateDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("generic");
  const [copiedXML, setCopiedXML] = useState(false);
  const [copiedURLs, setCopiedURLs] = useState(false);

  const generateFeedMutation = trpc.rssFeed.generateUpdatedFeed.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { data: updatedFeed, isPending: feedLoading } = generateFeedMutation;
  const generateFeed = generateFeedMutation.mutate;

  const { data: urlList } = trpc.rssFeed.getArtworkURLList.useQuery(
    { projectId },
    { enabled: open }
  );

  const { data: instructions } = trpc.rssFeed.getPlatformInstructions.useQuery(
    { platform: selectedPlatform },
    { enabled: !!selectedPlatform }
  );

  const handleGenerateFeed = () => {
    generateFeed({ projectId });
  };

  const copyToClipboard = async (text: string, type: 'xml' | 'urls') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'xml') {
        setCopiedXML(true);
        setTimeout(() => setCopiedXML(false), 2000);
      } else {
        setCopiedURLs(true);
        setTimeout(() => setCopiedURLs(false), 2000);
      }
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('File downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update RSS Feed with New Artwork</DialogTitle>
          <DialogDescription>
            Choose how you want to update your podcast hosting platform with the new artwork
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Your Podcast Hosting Platform</label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="generic">Other Platform</SelectItem>
                <SelectItem value="libsyn">Libsyn</SelectItem>
                <SelectItem value="rss.com">RSS.com</SelectItem>
                <SelectItem value="spreaker">Spreaker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="urls" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="urls">Artwork URLs</TabsTrigger>
              <TabsTrigger value="rss">Full RSS Feed</TabsTrigger>
            </TabsList>

            {/* Artwork URLs Tab */}
            <TabsContent value="urls" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">📋 Copy Artwork URLs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Copy the artwork URLs and paste them into your hosting platform's episode settings
                </p>

                {urlList && (
                  <>
                    <div className="bg-muted p-4 rounded-md mb-4 max-h-64 overflow-y-auto font-mono text-xs">
                      {urlList.episodes.map((ep: any, index: number) => (
                        <div key={`${ep.episodeNumber}-${index}`} className="mb-3">
                          <div className="font-semibold">Episode {ep.episodeNumber}: {ep.title}</div>
                          <div className="text-muted-foreground break-all">{ep.artworkUrl}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(urlList.urlList, 'urls')}
                        className="flex-1"
                      >
                        {copiedURLs ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All URLs
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadFile(urlList.urlList, 'artwork-urls.txt')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download as TXT
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>

            {/* Full RSS Feed Tab */}
            <TabsContent value="rss" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-2">📄 Updated RSS Feed XML</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate and copy the complete RSS feed with updated artwork URLs
                </p>

                {!updatedFeed && (
                  <Button onClick={handleGenerateFeed} disabled={feedLoading}>
                    {feedLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      'Generate Updated RSS Feed'
                    )}
                  </Button>
                )}

                {updatedFeed && (
                  <>
                    <div className="bg-muted p-4 rounded-md mb-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                        {updatedFeed.updatedXML}
                      </pre>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md mb-4">
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                        <CheckCircle className="h-4 w-4" />
                        <span>Updated {updatedFeed.episodesUpdated} episodes with new artwork</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(updatedFeed.updatedXML, 'xml')}
                        className="flex-1"
                      >
                        {copiedXML ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy RSS Feed
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => downloadFile(updatedFeed.updatedXML, 'updated-feed.xml')}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download XML
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Platform-Specific Instructions */}
          {instructions && (
            <Card className="p-4 bg-blue-50 dark:bg-blue-950">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {instructions.title}
              </h3>
              <ol className="space-y-2 text-sm">
                {instructions.steps.map((step: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="font-semibold min-w-[1.5rem]">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {instructions.notes && instructions.notes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold mb-2">📌 Important Notes:</p>
                  <ul className="space-y-1 text-sm">
                    {instructions.notes.map((note: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span>•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

