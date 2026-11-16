import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Farmacia San Judas SIG" },
      { name: "description", content: "Cree una nueva contraseña para su cuenta de Farmacia San Judas SIG." },
      { property: "og:title", content: "Nueva contraseña · Farmacia San Judas SIG" },
      { property: "og:description", content: "Cree una nueva contraseña para su cuenta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmar) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password });
    setCargando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    navigate({ to: "/auth", search: { redirect: undefined } });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-card">
        <Logo />
        <h1 className="mt-6 text-xl font-bold">Crear nueva contraseña</h1>
        <form onSubmit={enviar} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p1">Nueva contraseña</Label>
            <Input id="p1" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p2">Confirmar contraseña</Label>
            <Input id="p2" type="password" minLength={6} required value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={cargando}>Guardar contraseña</Button>
        </form>
      </div>
    </div>
  );
}
