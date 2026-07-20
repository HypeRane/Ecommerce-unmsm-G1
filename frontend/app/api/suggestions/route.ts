import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProductSuggestion = {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  reason?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("product_id");

  try {
    const supabase = await createClient();

    if (productId) {
      // Intentar RPC get_related_products
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_related_products", {
        product_id: productId,
        limit_count: 5,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const items = rpcData.map((p: { id: string; name: string; price: number; image_url?: string }) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url || "https://via.placeholder.com/200",
          reason: "Producto relacionado",
        }));
        return NextResponse.json(items);
      }

      // Fallback: buscar productos de la misma categoría
      const { data: currentProduct } = await supabase
        .from("products")
        .select("category_id")
        .eq("id", productId)
        .single();

      if (currentProduct?.category_id) {
        const { data: related } = await supabase
          .from("products")
          .select("id, name, price, image_url")
          .eq("category_id", currentProduct.category_id)
          .neq("id", productId)
          .eq("is_active", true)
          .limit(5);

        if (related && related.length > 0) {
          const items = related.map((p) => ({
            ...p,
            reason: "Relacionado por categoría",
          }));
          return NextResponse.json(items);
        }
      }
    }

    // Si no hay product_id o fallback: obtener más vendidos o activos destacados
    const { data: bestSellers } = await supabase
      .from("products")
      .select("id, name, price, image_url")
      .eq("is_active", true)
      .order("sales", { ascending: false })
      .limit(5);

    if (bestSellers && bestSellers.length > 0) {
      const items = bestSellers.map((p) => ({
        ...p,
        reason: "Más vendido",
      }));
      return NextResponse.json(items);
    }

    // Datos por defecto si la base está vacía
    const mockSuggestions: ProductSuggestion[] = [
      { id: "1", name: "Polo UNMSM", price: 45.9, image_url: "https://via.placeholder.com/200", reason: "Recomendado" },
      { id: "2", name: "Mochila Tech", price: 129.9, image_url: "https://via.placeholder.com/200", reason: "Destacado" },
    ];

    return NextResponse.json(mockSuggestions);
  } catch (error) {
    console.error("Error en /api/suggestions:", error);
    return NextResponse.json([], { status: 500 });
  }
}
