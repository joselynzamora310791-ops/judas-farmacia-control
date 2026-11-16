import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { perfilQuery } from "@/lib/queries";
import { rutaInicio } from "@/lib/permisos";
import heroImg from "@/assets/farmacia-hero.jpg";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar · Farmacia San Judas SIG" },
      { name: "description", content: "Acceso del personal de Farmacia San Judas al sistema de información gerencial." },
      { property: "og:title", content: "Ingresar · Farmacia San Judas SIG" },
      { property: "og:description", content: "Acceso del personal de Farmacia San Judas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Modo = "ingresar" | "registro" | "recuperar";

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modo, setModo] = useState<Modo>("ingresar");
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  const { data: existeGerente } = useQuery({
    queryKey: ["existe-gerente"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("existe_gerente");
      if (error) throw error;
      return data as boolean;
    },
  });

  const irAInicio = async (userId: string) => {
    const perfil = await queryClient.fetchQuery(perfilQuery(userId));
    navigate({ to: rutaInicio(perfil.rol), replace: true });
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) irAInicio(data.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setMensaje(null);
    try {
      if (modo === "ingresar") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message);
        await irAInicio(data.user.id);
      } else if (modo === "registro") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { nombre } },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await irAInicio(data.user.id);
        } else {
          setMensaje("Le enviamos un correo de confirmación. Ábralo para activar su cuenta de gerente y luego inicie sesión.");
          setModo("ingresar");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMensaje("Si el correo está registrado, recibirá un enlace para crear una nueva contraseña.");
        setModo("ingresar");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCargando(false);
    }
  };

  const titulos: Record<Modo, { t: string; s: string; b: string }> = {
    ingresar: { t: "Bienvenido de nuevo", s: "Ingrese con su cuenta del personal", b: "Iniciar sesión" },
    registro: { t: "Configuración inicial", s: "Cree la cuenta del gerente de la farmacia", b: "Crear cuenta de gerente" },
    recuperar: { t: "Recuperar contraseña", s: "Le enviaremos un enlace a su correo", b: "Enviar enlace" },
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={heroImg} alt="" width={1600} height={1104} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo light />
          <div>
            <h2 className="max-w-md text-3xl font-bold text-primary-foreground">
              Información clara para cuidar la salud de Managua.
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/75">Inventario, ventas y reportes en córdobas, en tiempo real.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <h1 className="mt-8 text-2xl font-bold lg:mt-0">{titulos[modo].t}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{titulos[modo].s}</p>

          {mensaje && (
            <div className="mt-5 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-accent-foreground">{mensaje}</div>
          )}

          <form onSubmit={enviar} className="mt-6 space-y-4">
            {modo === "registro" && (
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre completo</Label>
                <Input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {modo !== "recuperar" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  {modo === "ingresar" && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setModo("recuperar")}>
                      ¿Olvidó su contraseña?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={modo === "registro" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando && <Loader2 className="size-4 animate-spin" />}
              {titulos[modo].b}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            {modo !== "ingresar" && (
              <button className="font-medium text-primary hover:underline" onClick={() => setModo("ingresar")}>
                Volver a iniciar sesión
              </button>
            )}
            {modo === "ingresar" && existeGerente === false && (
              <p>
                ¿Primera vez usando el sistema?{" "}
                <button className="font-medium text-primary hover:underline" onClick={() => setModo("registro")}>
                  Crear cuenta de gerente
                </button>
              </p>
            )}
            {modo === "ingresar" && existeGerente && (
              <p>Las cuentas del personal las crea el gerente desde el módulo de Usuarios.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
