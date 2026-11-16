import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sin-acceso")({
  head: () => ({
    meta: [
      { title: "Sin acceso · Farmacia San Judas SIG" },
      { name: "description", content: "Su cuenta aún no tiene un rol asignado." },
      { property: "og:title", content: "Sin acceso · Farmacia San Judas SIG" },
      { property: "og:description", content: "Su cuenta aún no tiene un rol asignado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SinAcceso,
});

function SinAcceso() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const salir = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-bold">Cuenta sin rol asignado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Su cuenta existe pero todavía no tiene acceso al sistema. Pida al gerente que le asigne el rol de cajero o gerente
          en el módulo de Usuarios.
        </p>
        <Button variant="outline" className="mt-6" onClick={salir}>Cerrar sesión</Button>
      </div>
    </div>
  );
}
