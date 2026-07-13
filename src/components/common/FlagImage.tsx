import React, { useState, useEffect } from 'react';
import { 
  getPlaceFlagUrl, 
  getParentCountryFlagUrl, 
  fetchFlagAsBlobUrl, 
  resolvedBlobUrlCache 
} from '../../utils/flagUtils';

interface FlagImageProps {
  placeId: string;
  alt?: string;
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

export const FlagImage: React.FC<FlagImageProps> = ({
  placeId,
  alt = '',
  className = '',
  title,
  onClick,
}) => {
  const [prevPlaceId, setPrevPlaceId] = useState(placeId);
  const [src, setSrc] = useState<string | null>(() => {
    if (resolvedBlobUrlCache.has(placeId)) {
      return resolvedBlobUrlCache.get(placeId)!;
    }
    return getPlaceFlagUrl(placeId);
  });

  // Synchronize state during render when placeId changes
  if (placeId !== prevPlaceId) {
    setPrevPlaceId(placeId);
    if (resolvedBlobUrlCache.has(placeId)) {
      setSrc(resolvedBlobUrlCache.get(placeId)!);
    } else {
      setSrc(getPlaceFlagUrl(placeId));
    }
  }

  useEffect(() => {
    let active = true;

    // If already in blob cache, no need to perform async fetch
    if (resolvedBlobUrlCache.has(placeId)) {
      return;
    }

    async function loadFlag() {
      const primaryUrl = getPlaceFlagUrl(placeId);
      if (!primaryUrl) return;

      try {
        const blobUrl = await fetchFlagAsBlobUrl(placeId, primaryUrl);
        if (active) {
          setSrc(blobUrl);
        }
      } catch (err) {
        console.warn(`Primary flag load failed for ${placeId}:`, err);
        // Fallback to parent country flag if primary fails
        const fallbackUrl = getParentCountryFlagUrl(placeId);
        if (fallbackUrl) {
          try {
            const fallbackBlobUrl = await fetchFlagAsBlobUrl(placeId, fallbackUrl);
            if (active) {
              setSrc(fallbackBlobUrl);
            }
          } catch {
            if (active) {
              setSrc(fallbackUrl);
            }
          }
        } else {
          if (active) {
            setSrc(primaryUrl);
          }
        }
      }
    }

    loadFlag();

    return () => {
      active = false;
    };
  }, [placeId]);

  const handleError = () => {
    const fallbackUrl = getParentCountryFlagUrl(placeId);
    if (fallbackUrl && src !== fallbackUrl) {
      setSrc(fallbackUrl);
    }
  };

  if (!src) {
    return <div className={`flag-placeholder ${className}`} style={{ backgroundColor: 'var(--color-base-300)', opacity: 0.15 }} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      title={title}
      onClick={onClick}
      onError={handleError}
      loading="lazy"
    />
  );
};
