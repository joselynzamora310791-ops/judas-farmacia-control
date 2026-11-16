import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_panel/_gerente")({
  beforeLoad: ({ context }) => {
    if (context.perfil.rol !== "gerente") throw redirect({ to: "/ventas" });
  },
  component: () => <Outlet />,
});
