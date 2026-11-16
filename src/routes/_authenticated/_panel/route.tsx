import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/AppSidebar";
import { UserMenu } from "@/components/app/UserMenu";
import { perfilQuery } from "@/lib/queries";
import { hoyManagua, formatFecha } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_panel")({
  beforeLoad: async ({ context }) => {
    const perfil = await context.queryClient.ensureQueryData(perfilQuery(context.user.id));
    if (!perfil.rol) throw redirect({ to: "/sin-acceso" });
    return { perfil };
  },
  component: PanelLayout,
});

function PanelLayout() {
  const { perfil } = Route.useRouteContext();
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar rol={perfil.rol} />
        <SidebarInset className="bg-background">
          <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="hidden text-sm text-muted-foreground sm:block">
              Managua · {formatFecha(hoyManagua())}
            </div>
            <div className="ml-auto">
              <UserMenu perfil={perfil} />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
