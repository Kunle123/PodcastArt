/**
 * Template utility functions for artwork generation and display
 * Centralized logic to avoid duplication across components
 */

import type { CSSProperties } from 'react';

/**
 * Get artwork URL with fallback logic
 * Priority: template.baseArtworkUrl -> project.podcastArtworkUrl -> empty string
 */
export function getArtworkUrl(
  template?: { baseArtworkUrl?: string | null } | null,
  project?: { podcastArtworkUrl?: string | null } | null
): string {
  return template?.baseArtworkUrl || project?.podcastArtworkUrl || '';
}

/**
 * Convert opacity (0-1) to hex string (00-FF)
 * Used for adding alpha channel to hex colors
 */
export function opacityToHex(opacity: string | number): string {
  const opacityValue = typeof opacity === 'string' ? parseFloat(opacity) : opacity;
  const hex = Math.round(opacityValue * 255).toString(16).padStart(2, '0');
  return hex.toUpperCase();
}

/**
 * Format episode number with label prefix
 * Supports: number only, "Ep. 1", "Episode 1", or custom format
 */
export function formatEpisodeLabel(
  episodeNumber: string | number,
  format?: string,
  prefix?: string,
  suffix?: string
): string {
  const num = episodeNumber.toString();
  
  switch (format) {
    case 'ep':
      return `Ep. ${num}`;
    case 'episode':
      return `Episode ${num}`;
    case 'custom':
      return `${prefix || ''}${num}${suffix || ''}`;
    case 'number':
    default:
      return num;
  }
}

/**
 * Get CSS classes and inline styles for episode number positioning
 * Handles preset positions (top-left, etc.) and custom drag positions
 */
export function getPositionStyles(
  position: string,
  customX?: string,
  customY?: string
): { className: string; style?: CSSProperties } {
  // Custom positioning uses percentage-based inline styles
  if (position === 'custom') {
    return {
      className: 'absolute flex items-center justify-center',
      style: {
        left: `${(parseFloat(customX || '0.25')) * 100}%`,
        top: `${(parseFloat(customY || '0.25')) * 100}%`,
        transform: 'translate(-50%, -50%)',
      },
    };
  }

  // Preset positions use Tailwind classes
  const positionMap: Record<string, string> = {
    'top-left': 'absolute flex items-center justify-center top-[5%] left-[5%]',
    'top-right': 'absolute flex items-center justify-center top-[5%] right-[5%]',
    'bottom-left': 'absolute flex items-center justify-center bottom-[5%] left-[5%]',
    'bottom-right': 'absolute flex items-center justify-center bottom-[5%] right-[5%]',
    'center': 'absolute flex items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return {
    className: positionMap[position] || positionMap['center'],
  };
}

/**
 * Get background color with opacity as hex color
 * Converts "#000000" + 0.8 opacity -> "#000000CC"
 */
export function getColorWithOpacity(color: string, opacity: string | number): string {
  const baseColor = color.startsWith('#') ? color : `#${color}`;
  const alphaHex = opacityToHex(opacity);
  return `${baseColor}${alphaHex}`;
}

