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
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("id", id)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      category: data.categories?.name || "General",
      image_url: data.image_url,
      sales: data.sales,
    };
  } catch {
    return null;
  }
}

async function getSuggestions(productId: string): Promise<Product[]> {
  try {
    const supabase = await createClient();

    // Intentar RPC get_related_products si existe
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_related_products", {
      product_id: productId,
      limit_count: 4,
    });

    if (!rpcErr && rpcData && rpcData.length > 0) {
      return rpcData.map((p: { id: string; name: string; price: number; image_url?: string }) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: 10,
        image_url: p.image_url,
      }));
    }

    // Fallback por categoría
    const { data: currentProduct } = await supabase
      .from("products")
      .select("category_id")
      .eq("id", productId)
      .single();

    if (currentProduct?.category_id) {
      const { data: related } = await supabase
        .from("products")
        .select("*")
        .eq("category_id", currentProduct.category_id)
        .neq("id", productId)
        .eq("is_active", true)
        .limit(4);

      if (related && related.length > 0) {
        return related as Product[];
      }
    }

    // Top más vendidos si no hay relacionados
    const { data: bestSellers } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .neq("id", productId)
      .limit(4);

    return (bestSellers as Product[]) || [];
  } catch {
    return [];
  }
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
