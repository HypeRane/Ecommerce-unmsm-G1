type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  active?: boolean;
};

async function getProducts(): Promise<Product[]> {
  const base = process.env.NEXT_PUBLIC_CATALOG_API || "http://localhost:8081";
  try {
    const res = await fetch(`${base}/products`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    // El backend devuelve { items: [...], meta: {...} }
    // Si es un array directo, devuelve eso; si es un objeto con items, extrae items
    return Array.isArray(data) ? data : data.items || [];
  } catch {
    // Si el microservicio aún no responde (cloud o local), no rompas la página.
    return [];
  }
}

export default async function CatalogoPage() {
  const products = await getProducts();

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-6">Catálogo</h1>

      {products.length === 0 && (
        <p className="text-gray-500">
          No se pudo conectar al servicio de catálogo. Verifica
          NEXT_PUBLIC_CATALOG_API en .env.local (o la variable de entorno en Vercel).
        </p>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <li key={p.id} className="border rounded-lg p-4">
            <p className="font-medium">{p.name}</p>
            <p className="text-gray-600">S/ {p.price.toFixed(2)}</p>
            <p className="text-sm text-gray-400">Stock: {p.stock}</p>
            {p.category && <p className="text-xs text-gray-500">Categoría: {p.category}</p>}
          </li>
        ))}
      </ul>
    </main>
  );
}