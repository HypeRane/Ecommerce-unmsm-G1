'use client';

import { useEffect, useState } from "react";
import { createClient } from '@supabase/supabase-js';

// Inicializa Supabase con tus credenciales
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('🔍 Verificando conexión...');

  useEffect(() => {
    async function fetchProducts() {
      try {
        setConnectionStatus('⏳ Conectando a Supabase...');
        
        // Intentar obtener productos
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .limit(10);
        
        if (error) {
          console.error('Error de Supabase:', error);
          throw new Error(`Error de conexión: ${error.message}`);
        }
        
        if (data && data.length > 0) {
          setProducts(data);
          setConnectionStatus(`✅ Conectado! (${data.length} productos encontrados)`);
        } else {
          setConnectionStatus('⚠️ Conectado pero no hay productos. Ejecuta el seed en Supabase.');
        }
        
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
        setConnectionStatus('❌ Error de conexión');
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🛒 E-Commerce UNMSM</h1>
          <p className="text-gray-600 mt-2">Catálogo de productos</p>
          
          {/* Estado de conexión */}
          <div className={`mt-4 p-3 rounded ${
            connectionStatus.includes('✅') ? 'bg-green-100 text-green-700' :
            connectionStatus.includes('❌') ? 'bg-red-100 text-red-700' :
            connectionStatus.includes('⚠️') ? 'bg-yellow-100 text-yellow-700' :
            'bg-blue-100 text-blue-700'
          }`}>
            {connectionStatus}
          </div>
          
          {error && (
            <div className="mt-2 p-3 bg-red-100 text-red-700 rounded">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Lista de productos */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">⏳ Cargando productos...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <p className="text-red-600">No se pudieron cargar los productos</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-yellow-600">⚠️ No hay productos disponibles</p>
            <p className="text-sm text-gray-500 mt-2">Ejecuta el seed en Supabase para insertar productos de prueba</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <h3 className="text-xl font-semibold text-gray-800">{product.name}</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  S/ {product.price?.toFixed(2)}
                </p>
                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <p>📦 Stock: {product.stock || 0}</p>
                  {product.category_id && (
                    <p>🏷️ Categoría: {product.category_id}</p>
                  )}
                  {product.is_active !== undefined && (
                    <p className={product.is_active ? 'text-green-600' : 'text-red-600'}>
                      {product.is_active ? '✅ Activo' : '❌ Inactivo'}
                    </p>
                  )}
                </div>
                <button className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors">
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Información de depuración */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs text-gray-500">
          <p>🔗 Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
          <p>📦 Total productos: {products.length}</p>
          <p>🔄 Estado: {loading ? 'Cargando...' : 'Listo'}</p>
        </div>
      </div>
    </div>
  );
}