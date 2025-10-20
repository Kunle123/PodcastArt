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
            fontSize: 'clamp(1rem, 5vw, 4rem)',
          }}
        >
          {formattedLabel}
        </span>
      </div>
    </div>
  );
}

