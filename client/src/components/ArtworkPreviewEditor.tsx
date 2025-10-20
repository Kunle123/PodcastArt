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
  labelFormat?: string;
  customPrefix?: string;
  customSuffix?: string;
  borderRadius?: number;
  bonusNumberingMode?: string;
  bonusLabel?: string;
  bonusPrefix?: string;
  bonusSuffix?: string;
  showNavigation: string;
  navigationPosition: string;
  navigationStyle: string;
}

export default function ArtworkPreviewEditor({ onSave, existingTemplate, projectArtworkUrl }: ArtworkPreviewEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [baseImage, setBaseImage] = useState<HTMLImageElement | null>(null);
  // Initialize baseImageUrl from existing template or project artwork
  const [baseImageUrl, setBaseImageUrl] = useState<string>(
    existingTemplate?.baseArtworkUrl || projectArtworkUrl || ''
  );
  
  // Configuration state - initialize from existing template if available
  const [position, setPosition] = useState(existingTemplate?.episodeNumberPosition || 'top-right');
  const [fontSize, setFontSize] = useState(parseInt(existingTemplate?.episodeNumberSize || '120'));
  const [textColor, setTextColor] = useState(existingTemplate?.episodeNumberColor || '#FFFFFF');
  const [bgColor, setBgColor] = useState(existingTemplate?.episodeNumberBgColor || '#000000');
  const [bgOpacity, setBgOpacity] = useState(parseFloat(existingTemplate?.episodeNumberBgOpacity || '0.8'));
  const [borderRadius, setBorderRadius] = useState(8); // New: border radius
  const [labelFormat, setLabelFormat] = useState<'number' | 'ep' | 'episode' | 'custom'>('number'); // New: label format
  const [customPrefix, setCustomPrefix] = useState(''); // New: custom prefix (e.g. "Download - ")
  const [customSuffix, setCustomSuffix] = useState(''); // New: custom suffix
  
  // Bonus episode configuration
  const [bonusNumberingMode, setBonusNumberingMode] = useState<'included' | 'separate' | 'none'>(
    (existingTemplate?.bonusNumberingMode as 'included' | 'separate' | 'none') || 'included'
  );
  const [bonusLabel, setBonusLabel] = useState(existingTemplate?.bonusLabel || 'Bonus');
  const [bonusPrefix, setBonusPrefix] = useState(existingTemplate?.bonusPrefix || '');
  const [bonusSuffix, setBonusSuffix] = useState(existingTemplate?.bonusSuffix || '');
  
  const [showNav, setShowNav] = useState(existingTemplate?.showNavigation === 'true' ? true : true);
  const [navPosition, setNavPosition] = useState(existingTemplate?.navigationPosition || 'bottom-center');
  const [navStyle, setNavStyle] = useState(existingTemplate?.navigationStyle || 'arrows');
  const [previewNumber, setPreviewNumber] = useState('42');
  
  // Draggable position (percentage of canvas size)
  const [customX, setCustomX] = useState(0.9); // 90% from left (top-right default)
  const [customY, setCustomY] = useState(0.1); // 10% from top
  const [isDragging, setIsDragging] = useState(false);
  
  // Load existing template artwork on mount
  useEffect(() => {
    const artworkUrl = existingTemplate?.baseArtworkUrl || projectArtworkUrl;
    console.log('[Template Editor] Loading artwork:', artworkUrl);
    console.log('[Template Editor] Existing template:', existingTemplate);
    console.log('[Template Editor] Project artwork URL:', projectArtworkUrl);
    
    if (artworkUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('[Template Editor] Image loaded successfully:', img.width, 'x', img.height);
        setBaseImage(img);
        setBaseImageUrl(artworkUrl);
      };
      
      img.onerror = (error) => {
        console.error('[Template Editor] Failed to load image with CORS:', artworkUrl, error);
        // Try without CORS
        const img2 = new Image();
        img2.onload = () => {
          console.log('[Template Editor] Image loaded without CORS');
          setBaseImage(img2);
          setBaseImageUrl(artworkUrl);
        };
        img2.onerror = (err) => {
          console.error('[Template Editor] Failed to load image completely:', err);
        };
        img2.src = artworkUrl;
      };
      
      img.src = artworkUrl;
    } else {
      console.log('[Template Editor] No artwork URL available');
    }
  }, [existingTemplate?.baseArtworkUrl, projectArtworkUrl]);

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

    // Set canvas to square (podcast artwork standard)
    // Use larger dimension to ensure full quality
    const size = Math.max(baseImage.width, baseImage.height);
    const targetSize = 600; // Fixed size for consistent preview
    const scale = targetSize / size;
    
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Draw base image centered in square canvas
    const imgScale = Math.min(canvas.width / baseImage.width, canvas.height / baseImage.height);
    const imgWidth = baseImage.width * imgScale;
    const imgHeight = baseImage.height * imgScale;
    const imgX = (canvas.width - imgWidth) / 2;
    const imgY = (canvas.height - imgHeight) / 2;
    
    // Fill background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(baseImage, imgX, imgY, imgWidth, imgHeight);

    // Calculate position for episode number
    // Use custom draggable position if position is 'custom', otherwise use preset
    let x = 0;
    let y = 0;
    let textAlign: CanvasTextAlign = 'center';
    let textBaseline: CanvasTextBaseline = 'middle';
    const padding = 30; // Define padding at function scope

    if (position === 'custom') {
      x = customX * canvas.width;
      y = customY * canvas.height;
    } else {
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
    }

    // Set font (scale to canvas size)
    const scaledFontSize = (fontSize / size) * targetSize;
    ctx.font = `bold ${scaledFontSize}px Arial`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = textBaseline;

    // Format the label based on selection
    const displayText = labelFormat === 'ep' 
      ? `Ep. ${previewNumber}`
      : labelFormat === 'episode'
      ? `Episode ${previewNumber}`
      : labelFormat === 'custom'
      ? `${customPrefix}${previewNumber}${customSuffix}`
      : previewNumber;

    // Measure text for background
    const metrics = ctx.measureText(displayText);
    const textWidth = metrics.width;
    const textHeight = scaledFontSize;

    // Draw background rectangle with rounded corners
    if (bgOpacity > 0) {
      const bgPadding = 15;
      const scaledRadius = (borderRadius / size) * targetSize;
      
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

      // Draw rounded rectangle
      ctx.fillStyle = hexToRgba(bgColor, bgOpacity);
      ctx.beginPath();
      ctx.roundRect(bgX, bgY, bgWidth, bgHeight, scaledRadius);
      ctx.fill();
    }

    // Draw episode number with label
    ctx.fillStyle = textColor;
    ctx.fillText(displayText, x, y);

    // Draw navigation indicators if enabled
    if (showNav) {
      const navFontSize = 28;
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
  }, [baseImage, position, customX, customY, fontSize, textColor, bgColor, bgOpacity, borderRadius, labelFormat, customPrefix, customSuffix, showNav, navPosition, navStyle, previewNumber]);

  // Mouse handlers for dragging
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (position !== 'custom') {
      setPosition('custom');
    }
    setIsDragging(true);
    handleCanvasMouseMove(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    if (isDragging || e.type === 'mousedown') {
      setCustomX(Math.max(0, Math.min(1, x)));
      setCustomY(Math.max(0, Math.min(1, y)));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // Color presets
  const colorPresets = [
    { name: 'Classic', text: '#FFFFFF', bg: '#000000' },
    { name: 'Bold Red', text: '#FFFFFF', bg: '#DC2626' },
    { name: 'Ocean Blue', text: '#FFFFFF', bg: '#2563EB' },
    { name: 'Forest', text: '#FFFFFF', bg: '#16A34A' },
    { name: 'Sunset', text: '#FFFFFF', bg: '#F59E0B' },
    { name: 'Purple', text: '#FFFFFF', bg: '#9333EA' },
    { name: 'Pink', text: '#FFFFFF', bg: '#EC4899' },
    { name: 'Dark Slate', text: '#F1F5F9', bg: '#1E293B' },
    { name: 'Light', text: '#1F2937', bg: '#F3F4F6' },
  ];

  const applyColorPreset = (preset: { text: string; bg: string }) => {
    setTextColor(preset.text);
    setBgColor(preset.bg);
  };

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
      labelFormat,
      customPrefix,
      customSuffix,
      borderRadius,
      bonusNumberingMode,
      bonusLabel,
      bonusPrefix,
      bonusSuffix,
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
            <div className="aspect-square w-full flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed">
              <p className="text-gray-500">Upload an image to see preview</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="aspect-square w-full max-w-md mx-auto relative">
                <canvas
                  ref={canvasRef}
                  className={`border-2 border-gray-300 rounded-lg w-full h-full object-contain ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
                  Click & Drag to Position
                </div>
              </div>
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
            
            {/* Label Format */}
            <div className="space-y-2">
              <Label>Label Format</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  type="button"
                  variant={labelFormat === 'number' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLabelFormat('number')}
                  className="w-full"
                >
                  42
                </Button>
                <Button
                  type="button"
                  variant={labelFormat === 'ep' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLabelFormat('ep')}
                  className="w-full text-xs"
                >
                  Ep. 42
                </Button>
                <Button
                  type="button"
                  variant={labelFormat === 'episode' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLabelFormat('episode')}
                  className="w-full text-xs"
                >
                  Episode 42
                </Button>
                <Button
                  type="button"
                  variant={labelFormat === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLabelFormat('custom')}
                  className="w-full text-xs"
                >
                  Custom
                </Button>
              </div>
              
              {/* Custom Label Fields */}
              {labelFormat === 'custom' && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs">Prefix (before number)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 'Download - '"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Suffix (after number)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. ' | Listen Now'"
                      value={customSuffix}
                      onChange={(e) => setCustomSuffix(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="bg-muted p-2 rounded text-xs">
                    Preview: <span className="font-bold">{customPrefix}{previewNumber}{customSuffix}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom (Drag on Canvas)</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
              {position === 'custom' && (
                <p className="text-xs text-muted-foreground">
                  Click and drag on the canvas to position the number
                </p>
              )}
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

            {/* Border Radius */}
            <div className="space-y-2">
              <Label>Corner Rounding: {borderRadius}px</Label>
              <Slider
                value={[borderRadius]}
                onValueChange={(value) => setBorderRadius(value[0])}
                min={0}
                max={40}
                step={2}
              />
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Square</span>
                <span className="flex-1 text-right">Rounded</span>
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
              <Label>Color Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {colorPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyColorPreset(preset)}
                    className="flex items-center gap-2 text-xs p-2 h-auto"
                  >
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: preset.text }}
                      />
                      <div 
                        className="w-4 h-4 rounded border" 
                        style={{ backgroundColor: preset.bg }}
                      />
                    </div>
                    <span className="flex-1 text-left">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Bonus Episode Configuration */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Bonus Episode Labeling</h3>
            <p className="text-sm text-muted-foreground">
              Configure how bonus episodes are labeled when marked as bonus
            </p>
            
            <div className="space-y-2">
              <Label>Bonus Numbering Mode</Label>
              <Select 
                value={bonusNumberingMode} 
                onValueChange={(value: 'included' | 'separate' | 'none') => setBonusNumberingMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="included">
                    <div className="flex flex-col">
                      <span>Included in Sequence</span>
                      <span className="text-xs text-muted-foreground">Use normal episode labels (1, 2, 3...)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="separate">
                    <div className="flex flex-col">
                      <span>Separate Numbering</span>
                      <span className="text-xs text-muted-foreground">Label as "Bonus 1", "Bonus 2"...</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="none">
                    <div className="flex flex-col">
                      <span>No Number</span>
                      <span className="text-xs text-muted-foreground">Just show "Bonus" label</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bonusNumberingMode !== 'included' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bonus-label">Bonus Label</Label>
                  <Input
                    id="bonus-label"
                    type="text"
                    value={bonusLabel}
                    onChange={(e) => setBonusLabel(e.target.value)}
                    placeholder="Bonus"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., "Bonus", "Special", "Extra"
                  </p>
                </div>

                {bonusNumberingMode === 'separate' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="bonus-prefix">Prefix (Optional)</Label>
                      <Input
                        id="bonus-prefix"
                        type="text"
                        value={bonusPrefix}
                        onChange={(e) => setBonusPrefix(e.target.value)}
                        placeholder=""
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bonus-suffix">Suffix (Optional)</Label>
                      <Input
                        id="bonus-suffix"
                        type="text"
                        value={bonusSuffix}
                        onChange={(e) => setBonusSuffix(e.target.value)}
                        placeholder=""
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                  <p className="text-sm font-medium mb-1">Preview:</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {bonusNumberingMode === 'none' 
                      ? bonusLabel
                      : `${bonusPrefix}${bonusLabel} 1${bonusSuffix}`
                    }
                  </p>
                </div>
              </>
            )}
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

