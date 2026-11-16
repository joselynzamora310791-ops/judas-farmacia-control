import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FolderTree, LayoutDashboard, Package, PieChart, ShoppingCart, UserCog, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LogoMark } from "./Logo";
import { puedeAcceder, type Modulo, type Rol } from "@/lib/permisos";

const items: { titulo: string; url: string; icon: typeof Package; modulo: Modulo }[] = [
  { titulo: "Dashboard", url: "/dashboard", icon: LayoutDashboard, modulo: "dashboard" },
  { titulo: "Productos e inventario", url: "/productos", icon: Package, modulo: "productos" },
  { titulo: "Categorías", url: "/categorias", icon: FolderTree, modulo: "categorias" },
  { titulo: "Clientes", url: "/clientes", icon: Users, modulo: "clientes" },
  { titulo: "Ventas", url: "/ventas", icon: ShoppingCart, modulo: "ventas" },
  { titulo: "Reportes", url: "/reportes", icon: BarChart3, modulo: "reportes" },
  { titulo: "Análisis ABC", url: "/analisis-abc", icon: PieChart, modulo: "analisis-abc" },
  { titulo: "Usuarios y roles", url: "/usuarios", icon: UserCog, modulo: "usuarios" },
];

export function AppSidebar({ rol }: { rol: Rol | null }) {
  const { state } = useSidebar();
  const colapsado = state === "collapsed";
  const ruta = useRouterState({ select: (r) => r.location.pathname });
  const visibles = items.filter((i) => puedeAcceder(rol, i.modulo));

  return (
    <Sidebar collapsible="icon" className="no-print">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-8" />
          {!colapsado && (
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-sidebar-accent-foreground">Farmacia San Judas</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-primary">SIG</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Módulos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibles.map((item) => {
                const activo = ruta === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={activo}
                      tooltip={item.titulo}
                      className="h-10 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:font-semibold"
                    >
                      <Link to={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!colapsado && (
        <SidebarFooter className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/60">
          Managua, Nicaragua · Precios en C$
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
