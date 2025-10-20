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

  // Scale font size to match canvas editor behavior
  // Canvas uses: (fontSize / 1500) * 600 for preview
  // So 100px font becomes 40px in 600px canvas
  // We'll scale proportionally: fontSize * 0.4 for typical preview sizes
  const baseFontSize = parseInt(template.episodeNumberSize || '100');
  
  // Scale down by same ratio as canvas editor (600/1500 = 0.4)
  const scaledFontSize = Math.round(baseFontSize * 0.4);
  const minSize = 16; // Absolute minimum for readability
  
  // Use the scaled font size with small responsive adjustment
  // Allow slight scaling on very large/small screens
  const responsiveFontSize = `clamp(${minSize}px, ${scaledFontSize}px, ${scaledFontSize * 1.2}px)`;

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

