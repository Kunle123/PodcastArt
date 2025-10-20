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

  // Calculate responsive font size based on template setting
  // Uses clamp for responsiveness while respecting user's size preference
  const baseFontSize = parseInt(template.episodeNumberSize || '120');
  const minSize = Math.max(16, Math.floor(baseFontSize * 0.2)); // Min: 20% of base or 16px
  const maxSize = baseFontSize;
  const responsiveFontSize = `clamp(${minSize}px, 8vw, ${maxSize}px)`;

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

