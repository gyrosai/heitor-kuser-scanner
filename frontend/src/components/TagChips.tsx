"use client";

import { ALLOWED_TAGS } from "@/lib/types";

interface TagChipsProps {
  value: string[];
  onChange?: (tags: string[]) => void;
  readonly?: boolean;
  options?: readonly string[];
  size?: "sm" | "md";
}

export default function TagChips({
  value,
  onChange,
  readonly = false,
  options = ALLOWED_TAGS,
  size = "md",
}: TagChipsProps) {
  const toggle = (tag: string) => {
    if (readonly || !onChange) return;
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const heightClass = size === "sm" ? "min-h-[28px] py-1 px-2.5 text-xs" : "min-h-[36px] py-2 px-3 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((tag) => {
        const active = value.includes(tag);
        const Tag = readonly ? "span" : "button";
        return (
          <Tag
            key={tag}
            type={readonly ? undefined : "button"}
            onClick={readonly ? undefined : () => toggle(tag)}
            className={`inline-flex items-center rounded-full font-medium transition-colors ${heightClass} ${
              active
                ? "bg-[#FA6801] text-white border border-[#FA6801]"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            } ${readonly ? "" : "active:scale-95 cursor-pointer"}`}
          >
            {tag}
          </Tag>
        );
      })}
    </div>
  );
}
