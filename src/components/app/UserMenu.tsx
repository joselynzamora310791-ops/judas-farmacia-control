import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOMBRE_ROL } from "@/lib/permisos";
import type { Perfil } from "@/lib/queries";
import { RolBadge } from "./Badges";

export function UserMenu({ perfil }: { perfil: Perfil }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const iniciales = (perfil.nombre || perfil.email || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const salir = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
          {iniciales}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold">{perfil.nombre || perfil.email}</span>
          <span className="block text-[11px] text-muted-foreground">{perfil.rol ? NOMBRE_ROL[perfil.rol] : ""}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <div className="truncate text-sm">{perfil.email}</div>
          {perfil.rol && <RolBadge rol={perfil.rol} />}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={salir} className="text-destructive focus:text-destructive">
          <LogOut className="size-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
