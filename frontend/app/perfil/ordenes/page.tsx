"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
};

const statusVariant: Record<string, "success" | "warning" | "error" | "default"> = {
  pagado: "success",
  pendiente: "warning",
  enviado: "success",
  cancelado: "error",
};

const statusLabel: Record<string, string> = {
  pagado: "Pagado ✅",
  pendiente: "Pendiente",
  enviado: "Enviado 🚚",
  cancelado: "Cancelado ❌",
};

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, status, total, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (ordersData) setOrders(ordersData);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="pt-20 pb-10 flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="pt-20 pb-10">
      <div className="container-page max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-serif font-bold">Mis Órdenes</h1>
          <Link href="/catalogo">
            <Button variant="ghost" size="sm">Seguir comprando</Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-foreground-muted mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-foreground-muted">No tenés órdenes todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-foreground-muted">
                      {new Date(order.created_at).toLocaleDateString("es-PE", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="font-medium mt-1">
                      S/ {Number(order.total).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[order.status] ?? "default"}>
                      {statusLabel[order.status] ?? order.status}
                    </Badge>
                    <Link href={`/perfil/ordenes/${order.id}`}>
                      <Button variant="ghost" size="sm">Ver</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
