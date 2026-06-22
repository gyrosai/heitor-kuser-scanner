interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 16, color }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className="inline-block rounded-full border-2 border-transparent animate-[spin_0.8s_linear_infinite]"
      style={{
        width: size,
        height: size,
        borderTopColor: color ?? 'currentColor',
      }}
    />
  );
}
