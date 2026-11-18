<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Derive Dashboard KPIs in browser-safe pure helpers in `src/lib/indicadores.ts` using the existing dashboard query; this preserves the sales mutation's cache invalidation without additional data writes.
- Role checks live in `src/lib/permisos.ts` (UI) and are enforced again by database policies; never rely on UI hiding alone.
- Gerente-only pages live under `src/routes/_authenticated/_panel/_gerente/`, whose layout redirects other roles.
- Sales are written only through the `registrar_venta` database function so prices come from inventory, not the client.
- Historical exam sales use that same sales function in a single atomic, idempotent data operation, then mark a unique batch/ordinal and backdate only new rows; history filters run on paginated RLS-scoped sales with linked details.
- Staff accounts are created by the gerente via a server function using the admin client after a `has_role` check; public sign-up only creates the first gerente.
- Staff account edits and deletions use authenticated server functions with a fresh gerente check; edits preserve roles and deletes reject the caller's own ID so browser controls cannot bypass account protections.
