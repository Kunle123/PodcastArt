# Code Duplication Analysis & Refactoring Suggestions

## 🔍 Identified Duplications

### 1. **Episode Number Overlay Component** (HIGH PRIORITY)
**Duplicated in:**
- `client/src/components/ArtworkWorkflow.tsx` (lines ~238-278)
- `client/src/pages/ProjectDetail.tsx` (lines ~424-456)

**Duplicated Logic:**
- Position calculation (top-left, top-right, bottom-left, bottom-right, custom, center)
- Custom position percentage conversion (`parseFloat(template.customPositionX) * 100`)
- Background color with opacity hex conversion
- Border radius styling
- Responsive font sizing with `clamp()`
- Label formatting (number, ep, episode, custom)

**Lines of Duplication:** ~40 lines × 2 = 80 lines

---

### 2. **Artwork URL Fallback Logic** (MEDIUM PRIORITY)
**Pattern:** `template.baseArtworkUrl || project.podcastArtworkUrl || ''`

**Found in:**
- `ArtworkWorkflow.tsx` - 3 occurrences
- `ProjectDetail.tsx` - 2 occurrences
- `ArtworkPreviewEditor.tsx` - initialization logic

**Total:** 5+ occurrences

---

### 3. **Color Opacity to Hex Conversion** (MEDIUM PRIORITY)
**Pattern:** 
```javascript
Math.round((parseFloat(template.episodeNumberBgOpacity || '0.8')) * 255)
  .toString(16)
  .padStart(2, '0')
```

**Found in:**
- `ArtworkWorkflow.tsx`
- `ProjectDetail.tsx`

**Note:** Similar function `hexToRgba` exists in `ArtworkPreviewEditor.tsx` but not reused.

---

### 4. **Label Formatting Logic** (MEDIUM PRIORITY)
**Pattern:**
```javascript
template.labelFormat === 'ep' ? `Ep. ${number}`
  : template.labelFormat === 'episode' ? `Episode ${number}`
  : template.labelFormat === 'custom' ? `${prefix}${number}${suffix}`
  : number
```

**Found in:**
- `ArtworkWorkflow.tsx` (full logic)
- Partially in server-side `artworkGenerator.ts`

---

### 5. **Template Config Types** (LOW PRIORITY)
**Issue:** Template types are inferred from database schema, but similar shapes appear in:
- `ArtworkConfig` interface in `ArtworkPreviewEditor.tsx`
- Template mutation inputs in `server/routers.ts`
- Props passed between components

---

## ✅ Suggested Refactoring Strategy

### Phase 1: Create Shared UI Components (RECOMMENDED START HERE)

#### **1.1 Create `EpisodeNumberOverlay` Component**
**Location:** `client/src/components/ui/episode-number-overlay.tsx`

**Props:**
```typescript
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
  className?: string; // For additional customization
}
```

**Benefits:**
- ✅ Eliminates 80 lines of duplication
- ✅ Single source of truth for positioning logic
- ✅ Easier to maintain and update
- ✅ Consistent appearance across all views

**Usage:**
```tsx
<EpisodeNumberOverlay 
  episodeNumber="42"
  template={template}
/>
```

---

#### **1.2 Create `ArtworkPreview` Component**
**Location:** `client/src/components/ui/artwork-preview.tsx`

**Props:**
```typescript
interface ArtworkPreviewProps {
  artworkUrl?: string | null;
  fallbackUrl?: string | null;
  episodeNumber?: string | number;
  template?: TemplateConfig;
  showOverlay?: boolean;
  className?: string;
  aspectRatio?: 'square' | 'auto';
}
```

**Benefits:**
- ✅ Handles artwork URL fallback logic
- ✅ Optionally renders episode number overlay
- ✅ Consistent image loading and error handling
- ✅ Reusable across Dashboard, ProjectDetail, ArtworkWorkflow

---

### Phase 2: Create Utility Functions

#### **2.1 Create Template Utils**
**Location:** `client/src/lib/templateUtils.ts`

```typescript
// Get artwork URL with fallback
export function getArtworkUrl(
  template?: { baseArtworkUrl?: string | null }, 
  project?: { podcastArtworkUrl?: string | null }
): string {
  return template?.baseArtworkUrl || project?.podcastArtworkUrl || '';
}

// Convert opacity to hex
export function opacityToHex(opacity: string | number): string {
  const opacityValue = typeof opacity === 'string' ? parseFloat(opacity) : opacity;
  return Math.round(opacityValue * 255).toString(16).padStart(2, '0');
}

// Format episode label
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
    default:
      return num;
  }
}

// Get position styles
export function getPositionStyles(
  position: string,
  customX?: string,
  customY?: string
): { className: string; style?: React.CSSProperties } {
  if (position === 'custom') {
    return {
      className: 'absolute flex items-center justify-center',
      style: {
        left: `${(parseFloat(customX || '0.25')) * 100}%`,
        top: `${(parseFloat(customY || '0.25')) * 100}%`,
        transform: 'translate(-50%, -50%)',
      }
    };
  }

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
```

**Benefits:**
- ✅ Single source of truth for calculations
- ✅ Easy to test
- ✅ Can be used server-side and client-side
- ✅ Reduces cognitive load

---

### Phase 3: Type Consolidation (OPTIONAL)

#### **3.1 Shared Template Types**
**Location:** `shared/types.ts` (already exists)

Move template-related types to shared location:
```typescript
export interface TemplateConfig {
  id: string;
  baseArtworkUrl?: string | null;
  episodeNumberPosition: string;
  customPositionX?: string;
  customPositionY?: string;
  episodeNumberColor: string;
  episodeNumberBgColor: string;
  episodeNumberBgOpacity: string;
  episodeNumberSize?: string;
  borderRadius?: string;
  labelFormat?: string;
  customPrefix?: string;
  customSuffix?: string;
  // ... other fields
}
```

---

## 📊 Impact Analysis

### Before Refactoring:
- **Episode Overlay Logic:** 80 lines duplicated
- **Artwork URL Logic:** 5+ duplicated references
- **Helper Functions:** 3 duplicated implementations
- **Total Duplication:** ~120-150 lines

### After Refactoring:
- **Episode Overlay Logic:** 1 component (~50 lines), used everywhere
- **Artwork URL Logic:** 1 utility function, used everywhere
- **Helper Functions:** Centralized in utils
- **Net Reduction:** ~70-100 lines of code
- **Maintainability:** 🔴 → 🟢

---

## 🚀 Implementation Plan

### Recommended Order:

1. **Step 1:** Create utility functions (`templateUtils.ts`)
   - Low risk, high value
   - Can be adopted incrementally
   - ~30 minutes

2. **Step 2:** Create `EpisodeNumberOverlay` component
   - High value (eliminates biggest duplication)
   - Test in one location first
   - ~45 minutes

3. **Step 3:** Replace in `ArtworkWorkflow.tsx`
   - Verify preview still works
   - ~15 minutes

4. **Step 4:** Replace in `ProjectDetail.tsx`
   - Verify template preview still works
   - ~15 minutes

5. **Step 5:** Create `ArtworkPreview` component (optional)
   - Further consolidation
   - ~30 minutes

**Total Estimated Time:** ~2-2.5 hours

---

## 🎯 Benefits Summary

### Immediate:
- ✅ Easier to fix bugs (one place instead of many)
- ✅ Consistent UI behavior
- ✅ Smaller bundle size

### Long-term:
- ✅ Easier onboarding for new developers
- ✅ Faster feature development
- ✅ Better test coverage (test component once, not everywhere)

---

## ⚠️ Risks & Considerations

### Low Risk:
- Creating utility functions (no breaking changes)
- Creating new components (existing code unchanged until migration)

### Medium Risk:
- Replacing existing implementations (need careful testing)
- Custom positioning edge cases

### Mitigation:
- ✅ Keep old code until new code is tested
- ✅ Use Git branches for safety
- ✅ Test each view after migration
- ✅ Can roll back easily if issues arise

---

## 🤔 Decision Time

### Option A: Full Refactor (Recommended)
- Implement all phases
- ~2.5 hours of work
- Maximum long-term benefit

### Option B: Partial Refactor
- Just utilities + EpisodeNumberOverlay
- ~1.5 hours of work
- 80% of the benefit

### Option C: Minimal Changes
- Just utility functions
- ~30 minutes
- 30% of the benefit

**My Recommendation:** **Option B** (Partial Refactor)
- Best ROI (return on investment)
- Addresses the biggest pain point
- Low risk, high reward

