import React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const resolveSrc = (src?: string): string | undefined => {
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src
  if (src.startsWith('/')) return src
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (supabaseUrl && (src.startsWith('product-images/') || src.startsWith('avatars/') || src.includes('storage/v1/object/public'))) {
    if (src.includes('storage/v1/object/public')) {
      return src.startsWith('http') ? src : `${supabaseUrl.replace(/\/$/, '')}/${src.replace(/^\//, '')}`
    }
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${src}`
  }
  return src
}

const ImageWithFallback: React.FC<Props> = ({ fallbackSrc = "/placeholder.svg", onError, loading = "lazy", src, ...rest }) => {
  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (img.src.endsWith(fallbackSrc)) return;
    img.src = fallbackSrc;
    if (onError) onError(e);
  };

  const resolved = resolveSrc(src);

  return <img loading={loading} onError={handleError} src={resolved} {...rest} />;
};

export default ImageWithFallback;
