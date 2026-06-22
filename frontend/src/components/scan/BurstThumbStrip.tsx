"use client";

interface Shot {
  id: string;
  dataUrl: string;
}

interface BurstThumbStripProps {
  shots: Shot[];
  onProcess: () => void;
  onRemove?: (id: string) => void;
}

export default function BurstThumbStrip({ shots, onProcess, onRemove }: BurstThumbStripProps) {
  if (shots.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto p-3 bg-black/60 backdrop-blur-sm shrink-0">
      {shots.map((shot) => (
        <div key={shot.id} className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot.dataUrl}
            alt="Foto capturada"
            className="h-10 w-14 rounded-md object-cover"
          />
          {onRemove && (
            <button
              onClick={() => onRemove(shot.id)}
              aria-label="Remover foto"
              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white text-[10px] leading-none"
            >
              ×
            </button>
          )}
        </div>
      ))}

      <button
        onClick={onProcess}
        className="ml-auto shrink-0 rounded-xl bg-laranja-360 px-4 py-2 text-sm font-semibold text-white active:opacity-80 transition-opacity"
      >
        Processar ({shots.length})
      </button>
    </div>
  );
}
