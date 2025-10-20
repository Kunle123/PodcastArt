/**
 * Episode Number Overlay Component
 * 
 * Reusable component that displays episode numbers on artwork
 * with configurable positioning, styling, and label formatting.
 * 
 * Used in:
 * - ArtworkWorkflow (preview step)
 * - ProjectDetail (template preview)
 * - Dashboard (project cards)
 */

import { formatEpisodeLabel, getPositionStyles, getColorWithOpacity } from '@/lib/templateUtils';

interface EpisodeNumberOverlayProps {
  episodeNumber: string | number;
  template: {
    episodeNumberPosition: string;
    customPositionX?: string;
    customPositionY?: string;
    episodeNumberColor: string;
    episodeNumberBgColor: string;
    episodeNumberBgOpacity: string;
    episodeNumberSize?: string; // Font size from template
    borderRadius?: string;
    labelFormat?: string;
    customPrefix?: string;
    customSuffix?: string;
  };
  className?: string; // Additional classes for the outer container
}

export function EpisodeNumberOverlay({ 
  episodeNumber, 
  template,
  className = '',
}: EpisodeNumberOverlayProps) {
  // Get positioning styles (CSS classes or inline styles)
  const { className: positionClass, style: positionStyle } = getPositionStyles(
    template.episodeNumberPosition,
    template.customPositionX,
    template.customPositionY
  );

  // Format the episode label based on template settings
  const formattedLabel = formatEpisodeLabel(
    episodeNumber,
    template.labelFormat,
    template.customPrefix,
    template.customSuffix
  );

  // Get background color with opacity
  const backgroundColor = getColorWithOpacity(
    template.episodeNumberBgColor,
    template.episodeNumberBgOpacity || '0.8'
  );

  // Use the exact font size from template settings
  // The font size is already calibrated for artwork (typically 400-600px containers)
  // Only scale down on very small screens to maintain readability
  const baseFontSize = parseInt(template.episodeNumberSize || '100');
  const minSize = 16; // Absolute minimum for readability
  
  // Use max() to prefer the set pixel size, but scale down proportionally on tiny screens
  // On a 400px wide container, 25% = 100px, so this scales well
  const responsiveFontSize = `max(${minSize}px, min(${baseFontSize}px, 25vw))`;

  return (
    <div 
      className={`${positionClass} ${className}`}
      style={positionStyle}
    >
      <div 
        className="px-[3%] py-[2%]"
        style={{
          backgroundColor,
          borderRadius: `${template.borderRadius || '8'}px`,
        }}
      >
        <span 
          className="font-bold whitespace-nowrap"
          style={{
            color: template.episodeNumberColor || '#FFFFFF',
            fontSize: responsiveFontSize,
          }}
        >
          {formattedLabel}
        </span>
      </div>
    </div>
  );
}

