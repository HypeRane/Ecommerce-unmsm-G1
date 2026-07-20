"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/catalogo/ProductCard";
import { FiltersSidebar } from "@/components/catalogo/FiltersSidebar";
import { SortSelect } from "@/components/catalogo/SortSelect";
import { Pagination } from "@/components/ui/Pagination";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  sales?: number;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

type Props = {
  initialProducts: Product[];
  initialMeta: Meta;
  currentPage: number;
  totalPages: number;
};

export function CatalogoClient({ initialProducts, initialMeta, currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = {
    category: searchParams.get("category") || "",
    sort: searchParams.get("sort") || "name_asc",
  };

  function updateURL(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    router.push(`/catalogo?${params.toString()}`);
  }

  function handleSort(sort: string) {
    updateURL({ sort, page: "1" });
  }

  function handleFilterChange(newFilters: typeof filters & { page?: number }) {
    const params: Record<string, string> = {};
    if (newFilters.category) params.category = newFilters.category;
    else params.category = "";
    if (newFilters.sort && newFilters.sort !== "name_asc") params.sort = newFilters.sort;
    else params.sort = "";
    if (newFilters.page) params.page = String(newFilters.page);
    else params.page = "1";
    updateURL(params);
  }

  function handlePageChange(page: number) {
    updateURL({ page: String(page) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-56 shrink-0">
        <FiltersSidebar filters={filters} onFilterChange={handleFilterChange} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <SortSelect
            value={filters.sort}
            onChange={handleSort}
            total={initialMeta.total}
          />
        </div>

        {initialProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-foreground-muted mb-3">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-foreground-muted">No se encontraron productos</p>
            <p className="text-sm text-foreground-muted mt-1">
              Intentá con otros filtros o categorías
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-10">
              <Pagination
                page={currentPage}
                pages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
