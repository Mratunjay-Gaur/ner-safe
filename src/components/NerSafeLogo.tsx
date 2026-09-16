import React, { useState } from 'react';

export const WEBSITE_LOGO_URL =
  'https://static.vecteezy.com/system/resources/thumbnails/047/650/580/small/silhouettes-of-mountain-landscape-environment-concept-black-and-white-illustration-free-png.png';

export interface NerSafeLogoProps {
  className?: string;
  variant?: 'full' | 'symbol';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  alt?: string;
}

export const NerSafeLogo: React.FC<NerSafeLogoProps> = ({
  className = '',
  variant = 'full',
  size = 'md',
  alt = 'NER-SAFE Mountain Silhouette Logo',
}) => {
  const [imgSrc, setImgSrc] = useState<string>(WEBSITE_LOGO_URL);

  const sizeClasses: Record<string, string> = {
    xs: 'h-6 w-auto max-w-full',
    sm: 'h-8 w-auto max-w-full',
    md: 'h-10 w-auto max-w-full',
    lg: 'h-12 w-auto max-w-full',
    xl: 'h-16 w-auto max-w-full',
    hero: 'h-20 w-auto max-w-full',
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (imgSrc !== '/nersafe-symbol.png') {
          setImgSrc('/nersafe-symbol.png');
        }
      }}
      className={`object-contain shrink-0 select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}
      loading="eager"
    />
  );
};

