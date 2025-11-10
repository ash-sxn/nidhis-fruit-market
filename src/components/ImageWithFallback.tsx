import React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const ImageWithFallback: React.FC<Props> = ({ fallbackSrc = "/placeholder.svg", onError, loading = "lazy", ...rest }) => {
  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    if (img.src.endsWith(fallbackSrc)) return;
    img.src = fallbackSrc;
    if (onError) onError(e);
  };

  return <img loading={loading} onError={handleError} {...rest} />;
};

export default ImageWithFallback;
