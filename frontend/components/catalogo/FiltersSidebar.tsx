"use client";

import { Button } from "@/components/ui/Button";

type Filters = {
  category: string;
  sort: string;
  page?: number;
};

type FiltersSidebarProps = {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  electronicos: "Electrónicos",
  ropa: "Ropa",
  hogar: "Hogar",
  deportes: "Deportes",
  libros: "Libros",
};

export function FiltersSidebar({ filters, onFilterChange }: FiltersSidebarProps) {
  function setCategory(category: string) {
    onFilterChange({ ...filters, category: filters.category === category ? "" : category, page: 1 });
  }

  function clearFilters() {
    onFilterChange({ category: "", sort: "name_asc", page: 1 });
  }

  const hasFilters = filters.category || filters.sort !== "name_asc";

  return (
    <aside aria-label="Filtros de productos">
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Categorías</h3>
        <nav aria-label="Categorías de productos">
          <ul className="space-y-1">
            {Object.entries(CATEGORY_LABELS).map(([slug, name]) => (
              <li key={slug}>
                <button
                  onClick={() => setCategory(slug)}
                  aria-pressed={filters.category === slug}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    filters.category === slug
                      ? "bg-gold/10 text-gold font-medium"
                      : "text-foreground-secondary hover:text-foreground hover:bg-background-lighter"
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
          Limpiar filtros
        </Button>
      )}
    </aside>
  );
}
