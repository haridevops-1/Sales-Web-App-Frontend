import React from 'react';

export default function Image({
  src,
  alt = '',
  fill,
  sizes,
  className = '',
  style,
  ...rest
}: {
  src: string;
  alt?: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  const fillStyle: React.CSSProperties = fill
    ? { position: 'absolute', height: '100%', width: '100%', inset: 0 }
    : {};

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...fillStyle, ...style }}
      loading="lazy"
      {...rest}
    />
  );
}
