"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setFullName(data.user.user_metadata?.full_name ?? "");
      setLoading(false);
    });
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (error) {
        setSaveMessage(`Error: ${error.message}`);
      } else {
        setSaveMessage("✅ Perfil actualizado");
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch {
      setSaveMessage("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

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
      <div className="container-page max-w-2xl">
        <h1 className="text-2xl font-serif font-bold mb-8">Mi Perfil</h1>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-xl font-bold text-gold">
                  {fullName?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium">{fullName || "Usuario"}</p>
                <p className="text-sm text-foreground-muted">{user.email}</p>
              </div>
            </div>

            <Input
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input label="Correo electrónico" value={user.email ?? ""} disabled />

            {saveMessage && (
              <p className="text-sm text-foreground-secondary">{saveMessage}</p>
            )}

            <Button onClick={handleSave} loading={saving} className="w-full">
              Guardar cambios
            </Button>

            <div className="pt-2 space-y-2">
              <Link href="/perfil/ordenes">
                <Button variant="secondary" className="w-full">
                  Historial de órdenes
                </Button>
              </Link>
              <Button variant="ghost" className="w-full" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
