import { createClient } from "@/lib/supabase/server";
import { CatalogoClient } from "./CatalogoClient";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  sales?: number;
};

type ApiResponse = {
  items: Product[];
  meta: { page: number; limit: number; total: number; pages: number };
};

async function getProducts(
  searchParams: Record<string, string>,
): Promise<ApiResponse> {
  const base = process.env.NEXT_PUBLIC_CATALOG_API || "http://localhost:8081";
  const params = new URLSearchParams();
  if (searchParams.search) params.set("search", searchParams.search);
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  if (searchParams.page) params.set("page", searchParams.page);
  params.set("limit", searchParams.limit || "12");

  // Intentar microservicio
  try {
    const res = await fetch(`${base}/products?${params.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.items && data.items.length > 0) return data;
    }
  } catch {}

  // Fallback directo a Supabase
  try {
    const supabase = await createClient();
    const limit = parseInt(params.get("limit") || "12", 10);
    const page = parseInt(params.get("page") || "1", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .range(offset, offset + limit - 1);

    const category = params.get("category");
    if (category) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .single();

      if (catData) {
        query = query.eq("category_id", catData.id);
      }
    }

    const search = params.get("search");
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const sort = params.get("sort");
    switch (sort) {
      case "price_asc":
        query = query.order("price", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price", { ascending: false });
        break;
      case "name_desc":
        query = query.order("name", { ascending: false });
        break;
      default:
        query = query.order("name", { ascending: true });
    }

    const { data, count } = await query;

    const total = count || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    return {
      items: (data as Product[]) || [],
      meta: { page, limit, total, pages },
    };
  } catch {
    return { items: [], meta: { page: 1, limit: 12, total: 0, pages: 0 } };
  }
}

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const { items: products, meta } = await getProducts(sp);

  return (
    <div className="pt-20 pb-10">
      <div className="container-page">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold">Catálogo</h1>
          <p className="text-foreground-muted mt-1">Explora nuestros productos</p>
        </div>

        <CatalogoClient
          initialProducts={products}
          initialMeta={meta}
          currentPage={meta.page}
          totalPages={meta.pages}
        />
      </div>
    </div>
  );
}
