"use client";

import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar por nome ou empresa...',
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        size={16}
        strokeWidth={2}
        className="absolute left-[14px] top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full py-[11px] pl-[38px] pr-[14px] bg-white border border-border-default rounded-lg text-[13px] font-medium text-text-default placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-azul-noturno/20 focus:border-azul-noturno"
      />
    </div>
  );
}
