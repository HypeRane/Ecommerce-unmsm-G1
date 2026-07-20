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
  const limit = parseInt(searchParams.limit || "12", 10);
  const page = parseInt(searchParams.page || "1", 10);
  const offset = (page - 1) * limit;

  try {
    const supabase = await createClient();

    let query = supabase
      .from("products")
      .select("*, categories(name, slug)", { count: "exact" })
      .eq("is_active", true)
      .range(offset, offset + limit - 1);

    const category = searchParams.category;
    if (category) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .or(`slug.eq.${category},name.ilike.%${category}%`)
        .single();

      if (catData) {
        query = query.eq("category_id", catData.id);
      }
    }

    const search = searchParams.search;
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const sort = searchParams.sort;
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
      case "sales_desc":
        query = query.order("sales", { ascending: false });
        break;
      default:
        query = query.order("name", { ascending: true });
    }

    const { data, count } = await query;

    const total = count || 0;
    const pages = Math.max(1, Math.ceil(total / limit));

    const formattedProducts = (data || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      stock: item.stock,
      category: item.categories?.name || "General",
      image_url: item.image_url,
      sales: item.sales,
    }));

    return {
      items: formattedProducts,
      meta: { page, limit, total, pages },
    };
  } catch (error) {
    console.error("Error cargando productos de catálogo:", error);
    return { items: [], meta: { page: 1, limit: 12, total: 0, pages: 1 } };
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
