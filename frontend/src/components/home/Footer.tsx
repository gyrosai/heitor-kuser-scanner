interface FooterProps {
  onAbout?: () => void;
}

export function Footer({ onAbout }: FooterProps) {
  return (
    <div className="px-4 pt-8 pb-7 text-center">
      {onAbout && (
        <button
          type="button"
          onClick={onAbout}
          className="text-[11px] text-text-subtle underline hover:text-text-muted mb-3 block mx-auto"
        >
          Sobre o app
        </button>
      )}
      <div className="w-7 h-px bg-border-default mx-auto mb-[14px]" />
      <p className="text-[10px] font-medium text-text-subtle uppercase tracking-[1.2px] mb-1">
        Desenvolvido por
      </p>
      <a
        href="https://www.gyrosai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] font-bold text-gyros-roxo tracking-[0.4px] hover:underline"
      >
        Gyros AI Solutions
      </a>
    </div>
  );
}
