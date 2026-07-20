"use client";

type SortSelectProps = {
  value: string;
  onChange: (sort: string) => void;
  total: number;
};

const SORT_OPTIONS = [
  { value: "name_asc", label: "Nombre A-Z" },
  { value: "name_desc", label: "Nombre Z-A" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
];

export function SortSelect({ value, onChange, total }: SortSelectProps) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-foreground-muted whitespace-nowrap">
        {total} producto{total !== 1 ? "s" : ""}
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border-light bg-background-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
