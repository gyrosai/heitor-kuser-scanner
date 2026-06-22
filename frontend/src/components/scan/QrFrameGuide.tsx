"use client";

export default function QrFrameGuide() {
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-60 w-60">
        <div className="absolute top-0 left-0 h-10 w-10 border-t-4 border-l-4 border-white rounded-tl" />
        <div className="absolute top-0 right-0 h-10 w-10 border-t-4 border-r-4 border-white rounded-tr" />
        <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white rounded-bl" />
        <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white rounded-br" />
      </div>
      <p className="mt-6 text-center text-sm text-white/80">Aponte para um código QR</p>
    </div>
  );
}
