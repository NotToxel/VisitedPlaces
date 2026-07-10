import React, { useState } from 'react';
import { getPlaceFlagUrl, getParentCountryFlagUrl } from '../../utils/flagUtils';

interface FlagImageProps {
  placeId: string;
  alt?: string;
  className?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

// Global in-memory cache of placeId -> resolved image URL (either the primary regional flag or fallback)
const resolvedFlagCache = new Map<string, string>();
// Global set of placeIds that failed to load their regional flag
const failedRegionalFlags = new Set<string>();

export const FlagImage: React.FC<FlagImageProps> = ({
  placeId,
  alt = '',
  className = '',
  title,
  onClick,
}) => {
  const [prevPlaceId, setPrevPlaceId] = useState(placeId);
  const [src, setSrc] = useState<string | null>(() => {
    if (resolvedFlagCache.has(placeId)) {
      return resolvedFlagCache.get(placeId)!;
    }
    if (failedRegionalFlags.has(placeId)) {
      return getParentCountryFlagUrl(placeId);
    }
    return getPlaceFlagUrl(placeId);
  });

  // Adjust state during render when placeId changes (standard React performance optimization pattern)
  if (placeId !== prevPlaceId) {
    setPrevPlaceId(placeId);
    const resolved = resolvedFlagCache.has(placeId)
      ? resolvedFlagCache.get(placeId)!
      : failedRegionalFlags.has(placeId)
      ? getParentCountryFlagUrl(placeId)
      : getPlaceFlagUrl(placeId);
    setSrc(resolved);
  }

  const handleError = () => {
    const primaryUrl = getPlaceFlagUrl(placeId);
    if (src && src === primaryUrl) {
      failedRegionalFlags.add(placeId);
      const fallback = getParentCountryFlagUrl(placeId);
      if (fallback) {
        resolvedFlagCache.set(placeId, fallback);
        setSrc(fallback);
      }
    }
  };

  const handleLoad = () => {
    if (src) {
      resolvedFlagCache.set(placeId, src);
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
      onLoad={handleLoad}
      loading="lazy"
    />
  );
};
