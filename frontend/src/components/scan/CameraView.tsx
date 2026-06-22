"use client";

import { useEffect, useRef } from "react";

interface CameraViewProps {
  stream: MediaStream | null;
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export default function CameraView({ stream, onVideoReady }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream && onVideoReady) {
      const handleMeta = () => onVideoReady(video);
      video.addEventListener("loadedmetadata", handleMeta, { once: true });
      return () => video.removeEventListener("loadedmetadata", handleMeta);
    }
  }, [stream, onVideoReady]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
