"use client";

import { Importance } from "@/lib/types";

interface StarRatingProps {
  value: Importance;
  onChange?: (v: Importance) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  ariaLabel?: string;
}

const SIZE_CLASS: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
  lg: "h-9 w-9",
};

const TAP_CLASS: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  ariaLabel = "Importância",
}: StarRatingProps) {
  const handleClick = (level: 1 | 2 | 3) => {
    if (readonly || !onChange) return;
    onChange(value === level ? null : level);
  };

  return (
    <div
      role={readonly ? "img" : "radiogroup"}
      aria-label={ariaLabel}
      className="flex items-center gap-1"
    >
      {[1, 2, 3].map((level) => {
        const active = value !== null && value >= level;
        const Tag = readonly ? "span" : "button";
        return (
          <Tag
            key={level}
            type={readonly ? undefined : "button"}
            onClick={readonly ? undefined : () => handleClick(level as 1 | 2 | 3)}
            aria-checked={!readonly ? active : undefined}
            role={readonly ? undefined : "radio"}
            aria-label={`${level} estrela${level > 1 ? "s" : ""}`}
            className={`flex items-center justify-center transition-transform ${
              readonly
                ? ""
                : "active:scale-90 cursor-pointer " + TAP_CLASS[size]
            }`}
          >
            <svg
              className={`${SIZE_CLASS[size]} transition-colors ${
                active ? "text-[#FA6801]" : "text-slate-300"
              }`}
              fill={active ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.32.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </Tag>
        );
      })}
    </div>
  );
}
