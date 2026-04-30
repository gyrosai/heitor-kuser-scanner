"use client";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  helper?: string;
  disabled?: boolean;
}

export default function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  multiline = false,
  rows = 4,
  placeholder,
  helper,
  disabled = false,
}: FieldProps) {
  const isEmpty = required && !value?.trim();
  const baseClass =
    "w-full rounded-xl border bg-white px-4 py-3 text-slate-800 outline-none transition-colors";
  const stateClass = isEmpty
    ? "border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
    : "border-slate-200 focus:border-[#FA6801] focus:ring-2 focus:ring-[#FA6801]/20";
  const disabledClass = disabled ? "opacity-60 cursor-not-allowed" : "";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value || ""}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} ${stateClass} ${disabledClass} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseClass} ${stateClass} ${disabledClass}`}
        />
      )}
      {helper && (
        <p className="mt-1 text-xs text-slate-400">{helper}</p>
      )}
    </div>
  );
}
