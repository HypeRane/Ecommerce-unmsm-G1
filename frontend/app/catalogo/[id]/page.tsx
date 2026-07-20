import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductDetailClient } from "./ProductDetailClient";

type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  image_url?: string;
  sales?: number;
};

async function getProduct(id: string): Promise<Product | null> {
  const base = process.env.NEXT_PUBLIC_CATALOG_API || "http://localhost:8081";

  // Intentar microservicio
  try {
    const res = await fetch(`${base}/products/${id}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch {}

  // Fallback a Supabase
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    return data as Product | null;
  } catch {
    return null;
  }
}

async function getSuggestions(productId: string): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_SUGGESTIONS_API || "http://localhost:8083";

  // Intentar microservicio
  try {
    const res = await fetch(`${base}/suggestions?product_id=${productId}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) return data;
    }
  } catch {}

  // Fallback a Supabase (productos relacionados por categoría)
  try {
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("category_id")
      .eq("id", productId)
      .single();

    if (product?.category_id) {
      const { data: related } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", product.category_id)
        .neq("id", productId)
        .eq("is_active", true)
        .limit(4);
      return (related as Product[]) || [];
    }
  } catch {}

  return [];
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const suggestions = await getSuggestions(id);

  return (
    <div className="pt-20 pb-10">
      <div className="container-page">
        <ProductDetailClient product={product} suggestions={suggestions} />
      </div>
    </div>
  );
}
