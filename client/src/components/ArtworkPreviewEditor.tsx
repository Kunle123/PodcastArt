import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface ArtworkPreviewEditorProps {
  onSave: (config: ArtworkConfig) => void;
  existingTemplate?: any;
  projectArtworkUrl?: string | null;
}

export interface ArtworkConfig {
  baseArtworkUrl: string;
  episodeNumberPosition: string;
  episodeNumberFont: string;
  episodeNumberSize: string;
  episodeNumberColor: string;
  episodeNumberBgColor: string;
  episodeNumberBgOpacity: string;
  showNavigation: string;
  navigationPosition: string;
  navigationStyle: string;
}

export default function ArtworkPreviewEditor({ onSave, existingTemplate, projectArtworkUrl }: ArtworkPreviewEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  const [baseImageUrl, setBaseImageUrl] = useState<string>('');
  
  // Configuration state - initialize from existing template if available
  const [position, setPosition] = useState(existingTemplate?.episodeNumberPosition || 'top-right');
  const [fontSize, setFontSize] = useState(parseInt(existingTemplate?.episodeNumberSize || '120'));
  const [textColor, setTextColor] = useState(existingTemplate?.episodeNumberColor || '#FFFFFF');
  const [bgColor, setBgColor] = useState(existingTemplate?.episodeNumberBgColor || '#000000');
  const [bgOpacity, setBgOpacity] = useState(parseFloat(existingTemplate?.episodeNumberBgOpacity || '0.8'));
  const [showNav, setShowNav] = useState(existingTemplate?.showNavigation === 'true' ? true : true);
  const [navPosition, setNavPosition] = useState(existingTemplate?.navigationPosition || 'bottom-center');
  const [navStyle, setNavStyle] = useState(existingTemplate?.navigationStyle || 'arrows');
  const [previewNumber, setPreviewNumber] = useState('42');
  
  // Load existing template artwork on mount
  useEffect(() => {
    const artworkUrl = existingTemplate?.baseArtworkUrl || projectArtworkUrl;
    if (artworkUrl && !baseImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBaseImage(img);
        setBaseImageUrl(artworkUrl);
      };
      img.src = artworkUrl;
    }
  }, [existingTemplate, projectArtworkUrl, baseImage]);

  // Load base image when file is selected
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBaseImage(img);
        setBaseImageUrl(event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Draw preview on canvas whenever settings change
  useEffect(() => {
    if (!baseImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image (scaled down for preview)
    const scale = 0.2; // 20% of original size for preview
    canvas.width = baseImage.width * scale;
    canvas.height = baseImage.height * scale;

    // Draw base image
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // Calculate position for episode number
    const padding = 20 * scale;
    let x = 0;
    let y = 0;
    let textAlign: CanvasTextAlign = 'left';
    let textBaseline: CanvasTextBaseline = 'top';

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding;
        textAlign = 'left';
        textBaseline = 'top';
        break;
      case 'top-right':
        x = canvas.width - padding;
        y = padding;
        textAlign = 'right';
        textBaseline = 'top';
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        textAlign = 'left';
        textBaseline = 'bottom';
        break;
      case 'bottom-right':
        x = canvas.width - padding;
        y = canvas.height - padding;
        textAlign = 'right';
        textBaseline = 'bottom';
        break;
      case 'center':
        x = canvas.width / 2;
        y = canvas.height / 2;
        textAlign = 'center';
        textBaseline = 'middle';
        break;
    }

    // Set font (scaled)
    const scaledFontSize = fontSize * scale;
    ctx.font = `bold ${scaledFontSize}px Arial`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    // Measure text for background
    const metrics = ctx.measureText(previewNumber);
    const textWidth = metrics.width;
    const textHeight = scaledFontSize;

    // Draw background rectangle
    if (bgOpacity > 0) {
      const bgPadding = 15 * scale;
      ctx.fillStyle = hexToRgba(bgColor, bgOpacity);
      
      let bgX = x;
      let bgY = y;
      let bgWidth = textWidth + bgPadding * 2;
      let bgHeight = textHeight + bgPadding * 2;

      // Adjust background position based on text alignment
      if (textAlign === 'right') {
        bgX = x - textWidth - bgPadding;
      } else if (textAlign === 'center') {
        bgX = x - textWidth / 2 - bgPadding;
      } else {
        bgX = x - bgPadding;
      }

      if (textBaseline === 'bottom') {
        bgY = y - textHeight - bgPadding;
      } else if (textBaseline === 'middle') {
        bgY = y - textHeight / 2 - bgPadding;
      } else {
        bgY = y - bgPadding;
      }

      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    }

    // Draw episode number
    ctx.fillStyle = textColor;
    ctx.fillText(previewNumber, x, y);

    // Draw navigation indicators if enabled
    if (showNav) {
      const navFontSize = 24 * scale;
      ctx.font = `${navFontSize}px Arial`;
      ctx.fillStyle = textColor;

      let navX = canvas.width / 2;
      let navY = navPosition === 'bottom-center' 
        ? canvas.height - padding 
        : padding + navFontSize;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const navText = navStyle === 'arrows' || navStyle === 'both' 
        ? '← Prev   |   Next →' 
        : 'Swipe for more episodes';
      
      ctx.fillText(navText, navX, navY);
    }
  }, [baseImage, position, fontSize, textColor, bgColor, bgOpacity, showNav, navPosition, navStyle, previewNumber]);

  const handleSave = () => {
    if (!baseImageUrl) {
      alert('Please upload a base artwork image first');
      return;
    }

    const config: ArtworkConfig = {
      baseArtworkUrl: baseImageUrl,
      episodeNumberPosition: position,
      episodeNumberFont: 'Arial',
      episodeNumberSize: fontSize.toString(),
      episodeNumberColor: textColor,
      episodeNumberBgColor: bgColor,
      episodeNumberBgOpacity: bgOpacity.toString(),
      showNavigation: showNav ? 'true' : 'false',
      navigationPosition: navPosition,
      navigationStyle: navStyle,
    };

    onSave(config);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Preview Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {!baseImage ? (
            <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
              <p className="text-gray-500">Upload an image to see preview</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <canvas
                ref={canvasRef}
                className="border-2 border-gray-300 rounded-lg max-w-full"
                style={{ maxHeight: '500px' }}
              />
              <div className="flex items-center gap-2">
                <Label>Preview Episode Number:</Label>
                <Input
                  type="text"
                  value={previewNumber}
                  onChange={(e) => setPreviewNumber(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Customize Artwork</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Artwork Upload */}
          <div className="space-y-2">
            <Label htmlFor="base-artwork">Base Artwork Image</Label>
            <Input
              id="base-artwork"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          {/* Episode Number Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Episode Number Style</h3>
            
            {/* Position */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <Label>Font Size: {fontSize}px</Label>
              <Slider
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                min={40}
                max={200}
                step={10}
              />
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Background Opacity */}
            <div className="space-y-2">
              <Label>Background Opacity: {Math.round(bgOpacity * 100)}%</Label>
              <Slider
                value={[bgOpacity]}
                onValueChange={(value) => setBgOpacity(value[0])}
                min={0}
                max={1}
                step={0.1}
              />
            </div>
          </div>

          {/* Navigation Indicators */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Navigation Indicators</h3>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-nav"
                checked={showNav}
                onChange={(e) => setShowNav(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="show-nav">Show Navigation Indicators</Label>
            </div>

            {showNav && (
              <>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={navPosition} onValueChange={setNavPosition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={navStyle} onValueChange={setNavStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arrows">Arrows (← →)</SelectItem>
                      <SelectItem value="text">Text Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <Button onClick={handleSave} className="w-full" size="lg">
            Save Template & Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

