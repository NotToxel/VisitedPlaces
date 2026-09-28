import React, { useState, useEffect, useRef } from 'react';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null);
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
    if (isNearViewport) return;
    const image = imageRef.current;
    if (!image || !('IntersectionObserver' in window)) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setIsNearViewport(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(image);
    return () => observer.disconnect();
  }, [src, isNearViewport]);

  useEffect(() => {
    if (!isNearViewport && 'IntersectionObserver' in window) return;
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
  }, [placeId, isNearViewport]);

  const handleError = () => {
    const fallbackUrl = getParentCountryFlagUrl(placeId);
    if (fallbackUrl && src !== fallbackUrl) {
      setSrc(fallbackUrl);
    }
  };

  const imageKey = `${placeId}:${src}`;

  if (!src) {
    return null;
  }

  return (
    <img
      key={imageKey}
      ref={imageRef}
      src={src}
      alt={alt}
      className={`flag-image--shape ${className} ${loadedImageKey === imageKey ? '' : 'flag-image--pending'}`}
      title={title}
      onClick={onClick}
      onLoad={() => setLoadedImageKey(imageKey)}
      onError={handleError}
      loading="lazy"
    />
  );
};
