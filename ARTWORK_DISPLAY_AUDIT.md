# Artwork Display Audit - Complete Fix

## Issue
Artwork not displaying consistently across different views. Fixing one place breaks another.

## Root Causes
1. **Inconsistent URL Priority**: Some places check `template.baseArtworkUrl` first, others check `project.podcastArtworkUrl`
2. **No Fallback Chain**: Missing fallback from template → project → placeholder
3. **Missing Refetch Logic**: Some mutations don't invalidate both queries
4. **Inconsistent CSS**: `object-contain` vs `object-cover`

## Standard Pattern to Use EVERYWHERE

```typescript
// Always use this priority:
const artworkUrl = template?.baseArtworkUrl || project?.podcastArtworkUrl;

// In JSX:
{artworkUrl ? (
  <img 
    src={artworkUrl}
    alt="Artwork"
    className="w-full h-full object-cover"
  />
) : (
  <Placeholder />
)}
```

## Files to Fix

### 1. ✅ Dashboard.tsx (Line 172-177)
**Status**: CORRECT - Uses `project.podcastArtworkUrl` with fallback

### 2. ⚠️ ProjectDetail.tsx (Line 234-242)
**Status**: CORRECT - But should add template fallback

### 3. ❌ ProjectDetail.tsx (Line 416-422) 
**Status**: BROKEN - Only checks `template.baseArtworkUrl`, no fallback

### 4. ✅ ArtworkWorkflow.tsx (Line 228-237)
**Status**: CORRECT - Has fallback chain

### 5. ✅ ArtworkPreviewEditor.tsx (Line 72)
**Status**: CORRECT - Has fallback

### 6. ✅ TemplateEditor.tsx
**Status**: CORRECT - Passes projectArtworkUrl to editor

## Actions Required

1. Fix ProjectDetail.tsx template preview section (line 416)
2. Ensure all mutations invalidate BOTH queries
3. Standardize on `object-cover` for all artwork
4. Add responsive episode number overlay everywhere

## Episode Number Overlay Standard

```typescript
<div 
  className={`absolute ${
    position === 'top-left' ? 'top-[5%] left-[5%]' :
    position === 'top-right' ? 'top-[5%] right-[5%]' :
    position === 'bottom-left' ? 'bottom-[5%] left-[5%]' :
    position === 'bottom-right' ? 'bottom-[5%] right-[5%]' :
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  }`}
>
  <div 
    className="px-[3%] py-[2%]"
    style={{
      backgroundColor: bgColor,
      borderRadius: `${borderRadius}px`,
    }}
  >
    <span 
      className="font-bold whitespace-nowrap"
      style={{
        color: textColor,
        fontSize: 'clamp(1rem, 5vw, 4rem)',
      }}
    >
      {label}
    </span>
  </div>
</div>
```

Use percentage-based positioning and `clamp()` for font size.

