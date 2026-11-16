import { q } from "@/lib/db";
import { ALL, handler } from "@/lib/server";

// Datos para el modo unidad (celular del efectivo en campo).
export const GET = handler(ALL, async ({ user }) => {
  if (!user.unit_id) return { user, unit: null, incident: null };
  const [unit] = await q("select * from units where id = $1", [user.unit_id]);
  const [incident] = await q(
    "select * from incidents where unit_id = $1 and status in ('despachado','en_camino','en_sitio') order by priority, created_at limit 1",
    [user.unit_id]
  );
  return { user, unit: unit ?? null, incident: incident ?? null };
});
