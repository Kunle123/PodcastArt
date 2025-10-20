import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Upload, ArrowRight, Check, Download, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type WorkflowStep = 'setup' | 'preview' | 'generate' | 'complete';

interface ArtworkWorkflowProps {
  episodes: any[];
  template: any;
  projectId: string;
  isGenerating: boolean;
  currentStep: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  generationProgress: {
    total: number;
    completed: number;
    failed: number;
    errors: string[];
  };
  onImportRss: () => void;
  onAutoNumber: () => void;
  onGenerate: () => void;
  onDownload: () => void;
  onUpdateRss: () => void;
  onCancel: () => void;
  onNavigateToTemplate: () => void;
  autoNumberPending: boolean;
  importRssPending: boolean;
  downloadPending: boolean;
}

// Canvas Preview Component - Shows actual rendering with all customizations
function CanvasPreview({ template, episodeNumber }: { template: any; episodeNumber: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !template) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (square)
    canvas.width = 600;
    canvas.height = 600;

    // Fill background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load and draw base image
    if (template.baseArtworkUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Draw image centered
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Draw episode number with ALL template settings
        drawEpisodeNumber(ctx, canvas, template, episodeNumber);
      };
      img.onerror = () => {
        console.error('Failed to load image:', template.baseArtworkUrl);
        drawEpisodeNumber(ctx, canvas, template, episodeNumber);
      };
      img.src = template.baseArtworkUrl;
    } else {
      drawEpisodeNumber(ctx, canvas, template, episodeNumber);
    }
  }, [template, episodeNumber]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full aspect-square border-2 border-border rounded-lg"
    />
  );
}

function drawEpisodeNumber(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, template: any, episodeNumber: string) {
  const padding = 30;
  const fontSize = parseInt(template.episodeNumberSize || '120');
  const position = template.episodeNumberPosition || 'top-right';
  
  // Calculate position
  let x = canvas.width / 2;
  let y = canvas.height / 2;
  let align: CanvasTextAlign = 'center';
  let baseline: CanvasTextBaseline = 'middle';

  switch (position) {
    case 'top-left':
      x = padding;
      y = padding;
      align = 'left';
      baseline = 'top';
      break;
    case 'top-right':
      x = canvas.width - padding;
      y = padding;
      align = 'right';
      baseline = 'top';
      break;
    case 'bottom-left':
      x = padding;
      y = canvas.height - padding;
      align = 'left';
      baseline = 'bottom';
      break;
    case 'bottom-right':
      x = canvas.width - padding;
      y = canvas.height - padding;
      align = 'right';
      baseline = 'bottom';
      break;
  }

  // Format the label based on template settings
  const labelFormat = template.labelFormat || 'number';
  const customPrefix = template.customPrefix || '';
  const customSuffix = template.customSuffix || '';
  
  let displayText = episodeNumber;
  if (labelFormat === 'ep') {
    displayText = `Ep. ${episodeNumber}`;
  } else if (labelFormat === 'episode') {
    displayText = `Episode ${episodeNumber}`;
  } else if (labelFormat === 'custom') {
    displayText = `${customPrefix}${episodeNumber}${customSuffix}`;
  }

  // Set font
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  // Measure text
  const metrics = ctx.measureText(displayText);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  // Draw background with rounded corners
  const bgOpacity = parseFloat(template.episodeNumberBgOpacity || '0.8');
  const borderRadius = parseInt(template.borderRadius || '8');
  
  if (bgOpacity > 0) {
    const bgPadding = 15;
    let bgX = x - bgPadding;
    let bgY = y - bgPadding;
    let bgWidth = textWidth + bgPadding * 2;
    let bgHeight = textHeight + bgPadding * 2;

    // Adjust for alignment
    if (align === 'right') {
      bgX = x - textWidth - bgPadding;
    } else if (align === 'center') {
      bgX = x - textWidth / 2 - bgPadding;
    }

    if (baseline === 'bottom') {
      bgY = y - textHeight - bgPadding;
    } else if (baseline === 'middle') {
      bgY = y - textHeight / 2 - bgPadding;
    }

    // Draw rounded rectangle
    const bgColor = template.episodeNumberBgColor || '#000000';
    const r = bgColor.match(/\w\w/g);
    if (r) {
      const [red, green, blue] = r.map(x => parseInt(x, 16));
      ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${bgOpacity})`;
    } else {
      ctx.fillStyle = bgColor;
    }
    
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
    ctx.fill();
  }

  // Draw text
  ctx.fillStyle = template.episodeNumberColor || '#FFFFFF';
  ctx.fillText(displayText, x, y);
}

export function ArtworkWorkflow({
  episodes,
  template,
  projectId,
  isGenerating,
  currentStep,
  onStepChange,
  generationProgress,
  onImportRss,
  onAutoNumber,
  onGenerate,
  onDownload,
  onUpdateRss,
  onCancel,
  onNavigateToTemplate,
  autoNumberPending,
  importRssPending,
  downloadPending,
}: ArtworkWorkflowProps) {
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  
  const setCurrentStep = (step: WorkflowStep) => {
    onStepChange(step);
  };

  const canProceedToPreview = episodes.length > 0 && template?.baseArtworkUrl;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Artwork Generation Workflow</h2>
      </div>
      
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-8">
        {/* Step 1 */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
            currentStep === 'setup' ? 'bg-primary text-primary-foreground' :
            ['preview', 'generate', 'complete'].includes(currentStep) ? 'bg-green-500 text-white' :
            'bg-muted text-muted-foreground'
          }`}>
            {['preview', 'generate', 'complete'].includes(currentStep) ? <Check className="w-5 h-5" /> : '1'}
          </div>
          <div className="flex-1">
            <p className="font-semibold">Setup</p>
            <p className="text-xs text-muted-foreground">Import & Number</p>
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />

        {/* Step 2 */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
            currentStep === 'preview' ? 'bg-primary text-primary-foreground' :
            ['generate', 'complete'].includes(currentStep) ? 'bg-green-500 text-white' :
            'bg-muted text-muted-foreground'
          }`}>
            {['generate', 'complete'].includes(currentStep) ? <Check className="w-5 h-5" /> : '2'}
          </div>
          <div className="flex-1">
            <p className="font-semibold">Preview</p>
            <p className="text-xs text-muted-foreground">Review Artwork</p>
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />

        {/* Step 3 */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
            currentStep === 'generate' ? 'bg-primary text-primary-foreground' :
            currentStep === 'complete' ? 'bg-green-500 text-white' :
            'bg-muted text-muted-foreground'
          }`}>
            {currentStep === 'complete' ? <Check className="w-5 h-5" /> : '3'}
          </div>
          <div className="flex-1">
            <p className="font-semibold">Generate</p>
            <p className="text-xs text-muted-foreground">Create All</p>
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-muted-foreground mx-2" />

        {/* Step 4 */}
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
            currentStep === 'complete' ? 'bg-primary text-primary-foreground' :
            'bg-muted text-muted-foreground'
          }`}>
            4
          </div>
          <div className="flex-1">
            <p className="font-semibold">Complete</p>
            <p className="text-xs text-muted-foreground">Download</p>
          </div>
        </div>
      </div>

      {/* Step 1: Setup */}
      {currentStep === 'setup' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Step 1: Import and Setup Episodes</h3>
            <p className="text-sm text-blue-700 mb-4">
              First, import your podcast episodes from RSS and ensure they're numbered correctly.
            </p>
            
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={onImportRss}
                      disabled={importRssPending}
                    >
                      {importRssPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Upload className="mr-2 h-4 w-4" />
                      {episodes.length > 0 ? 'Re-Import RSS Feed' : 'Import RSS Feed'}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={onAutoNumber}
                      disabled={episodes.length === 0 || autoNumberPending}
                    >
                      {autoNumberPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      # Auto-Number Episodes
                    </Button>
                  </div>
                  
                  {episodes.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-semibold text-blue-900 mb-1">💡 Pro Tip:</p>
                      <p className="text-blue-800">
                        If you see wrong episode numbers, re-import your RSS feed and check "Clear existing episodes". 
                        This will fetch the correct numbers directly from your podcast feed.
                      </p>
                    </div>
                  )}
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Episodes Imported: {episodes.length}</p>
              <p className="text-sm text-muted-foreground">Template configured: {template?.baseArtworkUrl ? '✓ Yes' : '✗ No'}</p>
              {!template?.baseArtworkUrl && (
                <p className="text-xs text-orange-600 mt-1">⚠️ Please configure template first (visit Template tab)</p>
              )}
            </div>
            <Button
              onClick={() => {
                if (!canProceedToPreview) {
                  if (!template?.baseArtworkUrl) {
                    toast.error("Please configure a template first (visit Template tab)");
                  } else {
                    toast.error("Please import episodes first");
                  }
                  return;
                }
                setCurrentStep('preview');
              }}
              disabled={!canProceedToPreview}
            >
              Continue to Preview
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {currentStep === 'preview' && template && episodes.length > 0 && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Step 2: Preview Your Artwork</h3>
            <p className="text-sm text-purple-700 mb-4">
              Review how the episode numbers will appear on your podcast artwork. You can customize the template if needed.
            </p>
          </div>

          {/* Preview Sample - Using Canvas for accurate rendering */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">
                Sample: {episodes[0]?.seasonNumber ? `S${episodes[0].seasonNumber}E${episodes[0].episodeNumber || '1'}` : `Episode ${episodes[0]?.episodeNumber || '1'}`}
              </h3>
              <CanvasPreview 
                template={template}
                episodeNumber={episodes[0]?.episodeNumber || '1'}
              />
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Current Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium capitalize">{template.episodeNumberPosition?.replace('-', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Font Size:</span>
                    <span className="font-medium">{template.episodeNumberSize}px</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Text Color:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: template.episodeNumberColor }}></div>
                      <span className="font-medium">{template.episodeNumberColor}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Background:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border" style={{ backgroundColor: template.episodeNumberBgColor }}></div>
                      <span className="font-medium">{Math.round(parseFloat(template.episodeNumberBgOpacity || '0.8') * 100)}% opacity</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Not happy with the positioning?</strong>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToTemplate}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Customize Template
                </Button>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="confirm-preview"
                  checked={previewConfirmed}
                  onChange={(e) => setPreviewConfirmed(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="confirm-preview" className="text-sm font-medium">
                  I've reviewed the preview and it looks good
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('setup')}
            >
              Back to Setup
            </Button>
            <Button
              onClick={() => setCurrentStep('generate')}
              disabled={!previewConfirmed}
            >
              Continue to Generate
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generate */}
      {currentStep === 'generate' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Step 3: Generate All Artwork</h3>
            <p className="text-sm text-green-700 mb-4">
              Ready to create artwork for all {episodes.length} episodes. This may take a few minutes.
            </p>
          </div>

          {!isGenerating && generationProgress.completed === 0 && (
            <div className="flex gap-3 justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('preview')}
              >
                Back to Preview
              </Button>
              <Button
                onClick={() => {
                  setCurrentStep('generate');
                  onGenerate();
                }}
                disabled={episodes.length === 0}
                size="lg"
              >
                <Loader2 className="mr-2 h-4 w-4" />
                Start Generating {episodes.length} Artworks
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Complete */}
      {currentStep === 'complete' && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-900 mb-2">Artwork Generation Complete!</h3>
            <p className="text-green-700 mb-4">
              Successfully created artwork for {generationProgress.completed} episodes
            </p>
          </div>

          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={downloadPending}
            >
              {downloadPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Download className="mr-2 h-4 w-4" />
              Download All as ZIP
            </Button>

            <Button
              onClick={onUpdateRss}
            >
              📡 Update RSS Feed
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep('setup');
                setPreviewConfirmed(false);
              }}
            >
              Start Over
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

