import { createCanvas, loadImage, registerFont } from 'canvas';
import { backblazeStoragePut } from '../backblazeStorage';

// Helper function to format episode label
function formatLabel(
  episodeNumber: string, 
  labelFormat: string, 
  customPrefix: string, 
  customSuffix: string
): string {
  switch (labelFormat) {
    case 'ep':
      return `Ep. ${episodeNumber}`;
    case 'episode':
      return `Episode ${episodeNumber}`;
    case 'custom':
      return `${customPrefix}${episodeNumber}${customSuffix}`;
    case 'number':
    default:
      return episodeNumber;
  }
}

interface ArtworkOptions {
  baseImageUrl: string;
  episodeNumber: string;
  isBonus: boolean;
  
  // Positioning
  numberPosition: string; // 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'
  
  // Styling
  fontSize: number;
  fontColor: string;
  fontFamily: string;
  backgroundColor: string;
  backgroundOpacity: number;
  labelFormat: string; // 'number', 'ep', 'episode', 'custom'
  customPrefix: string;
  customSuffix: string;
  borderRadius: number;
  
  // Bonus episode configuration
  bonusNumberingMode: string; // 'included', 'separate', 'none'
  bonusLabel: string; // 'Bonus', 'Special', 'Extra', etc.
  bonusPrefix: string;
  bonusSuffix: string;
  
  // Navigation
  showNavigation: boolean;
  navigationPosition: string;
  navigationStyle: string; // 'arrows', 'text', 'both'
}

export async function generateEpisodeArtwork(options: ArtworkOptions): Promise<string> {
  const {
    baseImageUrl,
    episodeNumber,
    isBonus,
    numberPosition,
    fontSize,
    fontColor,
    fontFamily,
    backgroundColor,
    backgroundOpacity,
    labelFormat,
    customPrefix,
    customSuffix,
    borderRadius,
    bonusNumberingMode,
    bonusLabel,
    bonusPrefix,
    bonusSuffix,
    showNavigation,
    navigationPosition,
    navigationStyle,
  } = options;

  // Load base image
  const baseImage = await loadImage(baseImageUrl);
  
  // Create canvas with same dimensions as base image
  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext('2d');

  // Draw base image
  ctx.drawImage(baseImage, 0, 0);

  // Calculate position for episode number
  const padding = 40;
  let x = 0;
  let y = 0;
  let textAlign: CanvasTextAlign = 'left';
  let textBaseline: CanvasTextBaseline = 'top';

  switch (numberPosition) {
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

  // Generate label text based on bonus status and configuration
  let labelText = '';
  
  if (isBonus) {
    // Bonus episode labeling
    if (bonusNumberingMode === 'none') {
      // Just "Bonus" or custom label
      labelText = bonusLabel || 'Bonus';
    } else if (bonusNumberingMode === 'separate') {
      // "Bonus 1" or "B1" format
      labelText = `${bonusPrefix}${bonusLabel || 'Bonus'} ${episodeNumber}${bonusSuffix}`;
    } else {
      // 'included' - use normal labeling like regular episodes
      labelText = formatLabel(episodeNumber, labelFormat, customPrefix, customSuffix);
    }
  } else {
    // Regular episode labeling
    labelText = formatLabel(episodeNumber, labelFormat, customPrefix, customSuffix);
  }

  // Set font
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;

  // Measure text for background
  const metrics = ctx.measureText(labelText);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  // Draw background rectangle
  if (backgroundOpacity > 0) {
    ctx.fillStyle = hexToRgba(backgroundColor, backgroundOpacity);
    
    let bgX = x;
    let bgY = y;
    let bgWidth = textWidth + 30;
    let bgHeight = textHeight + 30;

    // Adjust background position based on text alignment
    if (textAlign === 'right') {
      bgX = x - textWidth - 15;
    } else if (textAlign === 'center') {
      bgX = x - textWidth / 2 - 15;
    } else {
      bgX = x - 15;
    }

    if (textBaseline === 'bottom') {
      bgY = y - textHeight - 15;
    } else if (textBaseline === 'middle') {
      bgY = y - textHeight / 2 - 15;
    } else {
      bgY = y - 15;
    }

    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
  }

  // Draw episode number/label
  ctx.fillStyle = fontColor;
  ctx.fillText(labelText, x, y);

  // Draw navigation indicators if enabled
  if (showNavigation) {
    drawNavigationIndicators(ctx, canvas.width, canvas.height, navigationPosition, navigationStyle, fontColor);
  }

  // Convert canvas to buffer
  const buffer = canvas.toBuffer('image/png');

  // Upload to S3
  const filename = `artwork/episode-${episodeNumber}-${Date.now()}.png`;
  const { url } = await backblazeStoragePut(filename, buffer, 'image/png');

  return url;
}

function drawNavigationIndicators(
  ctx: any,
  width: number,
  height: number,
  position: string,
  style: string,
  color: string
) {
  const padding = 30;
  const fontSize = 24;
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;

  let x = width / 2;
  let y = height - padding;

  if (position === 'bottom-center') {
    y = height - padding;
  } else if (position === 'top-center') {
    y = padding + fontSize;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (style === 'arrows' || style === 'both') {
    const arrowText = '← Prev   |   Next →';
    ctx.fillText(arrowText, x, y);
  } else if (style === 'text') {
    const textIndicator = 'Swipe for more episodes';
    ctx.fillText(textIndicator, x, y);
  }
}

function hexToRgba(hex: string, opacity: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export async function generateBatchArtwork(
  episodes: Array<{ id: string; episodeNumber: string }>,
  templateOptions: Omit<ArtworkOptions, 'episodeNumber'>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const episode of episodes) {
    try {
      const artworkUrl = await generateEpisodeArtwork({
        ...templateOptions,
        episodeNumber: episode.episodeNumber,
      });
      results.set(episode.id, artworkUrl);
    } catch (error) {
      console.error(`Failed to generate artwork for episode ${episode.id}:`, error);
    }
  }

  return results;
}

