import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, PackageSearch, ShieldCheck, ShoppingCart, TriangleAlert } from "lucide-react";
import heroImg from "@/assets/farmacia-hero.jpg";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Farmacia San Judas SIG · Sistema de información gerencial" },
      {
        name: "description",
        content: "Inventario, ventas, reportes y análisis ABC para Farmacia San Judas en Managua, Nicaragua.",
      },
      { property: "og:title", content: "Farmacia San Judas SIG" },
      {
        property: "og:description",
        content: "Inventario, ventas, reportes y análisis ABC para Farmacia San Judas en Managua.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const funciones = [
  { icon: PackageSearch, titulo: "Inventario al día", texto: "Existencias, precios y fechas de vencimiento de cada producto." },
  { icon: TriangleAlert, titulo: "Alertas oportunas", texto: "Rojo para stock bajo y naranja para lo que vence en menos de 30 días." },
  { icon: ShoppingCart, titulo: "Ventas rápidas", texto: "Registro de ventas en córdobas con descuento automático de inventario." },
  { icon: BarChart3, titulo: "Decisiones con datos", texto: "Reportes por período, categorías y análisis ABC de productos." },
];

function Inicio() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Interior de Farmacia San Judas"
          width={1600}
          height={1104}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Logo light />
          <Button asChild variant="secondary" size="sm">
            <Link to="/auth">Ingresar</Link>
          </Button>
        </header>
        <div className="mx-auto max-w-6xl px-6 pb-28 pt-16 md:pb-36 md:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
            <ShieldCheck className="size-3.5" /> Sistema de información gerencial
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] text-primary-foreground md:text-6xl">
            Farmacia San Judas <span className="text-sidebar-primary">SIG</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-primary-foreground/80">
            Controle inventario, ventas y rentabilidad de la farmacia desde un solo lugar. Hecho para Managua, en córdobas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-success text-success-foreground hover:bg-success/90">
              <Link to="/auth">Ingresar al sistema</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-14 grid max-w-6xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {funciones.map((f) => (
          <div key={f.titulo} className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-semibold">{f.titulo}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.texto}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Farmacia San Judas · Managua, Nicaragua
      </footer>
    </div>
  );
}
