import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(), updateUserById: vi.fn(), deleteUser: vi.fn(),
  from: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(), rpc: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  auth: { admin: { getUserById: mocks.getUserById, updateUserById: mocks.updateUserById, deleteUser: mocks.deleteUser } },
  from: mocks.from,
} }));
import { editarUsuario, eliminarUsuario } from "@/lib/usuarios.functions";

// Exercise the handler directly while keeping the auth/admin boundary observable.
const editar = editarUsuario as unknown as (input: unknown) => Promise<unknown>;
const eliminar = eliminarUsuario as unknown as (input: unknown) => Promise<unknown>;
const context = { userId: "gerente-activo", supabase: { rpc: mocks.rpc } };
const data = { id: "otro-usuario", nombre: "Cajero editado", email: "cajero@example.com", password: "" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.getUserById.mockResolvedValue({ data: { user: { email: "anterior@example.com", user_metadata: { otro: "conservar" } } }, error: null });
  mocks.updateUserById.mockResolvedValue({ error: null });
  mocks.deleteUser.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ single: mocks.single });
  mocks.single.mockResolvedValue({ data: { id: data.id }, error: null });
});

describe("Administración segura de usuarios", () => {
  it("edita nombre y correo sin tocar roles ni contraseña vacía", async () => {
    await editar({ data, context });
    expect(mocks.updateUserById).toHaveBeenCalledWith("otro-usuario", {
      email: "cajero@example.com", email_confirm: true,
      user_metadata: { otro: "conservar", nombre: "Cajero editado" },
    });
    expect(mocks.from.mock.calls).toEqual([["profiles"]]);
    expect(mocks.update).toHaveBeenCalledWith({ nombre: "Cajero editado", email: "cajero@example.com" });
  });
  it("modifica la contraseña únicamente cuando se proporciona", async () => {
    await editar({ data: { ...data, password: "Una-clave-segura-2026" }, context });
    expect(mocks.updateUserById.mock.calls[0]?.[1].password).toBe("Una-clave-segura-2026");
  });
  it("rechaza eliminar la cuenta de la sesión activa", async () => {
    await expect(eliminar({ data: { id: context.userId }, context })).rejects.toThrow("propia cuenta");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("permite al gerente eliminar otra cuenta", async () => {
    await eliminar({ data: { id: "otro-usuario" }, context });
    expect(mocks.deleteUser).toHaveBeenCalledWith("otro-usuario");
  });
  it("rechaza edición y eliminación por cajeros antes de usar acceso administrativo", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(editar({ data, context })).rejects.toThrow("Solo el gerente");
    await expect(eliminar({ data, context })).rejects.toThrow("Solo el gerente");
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});