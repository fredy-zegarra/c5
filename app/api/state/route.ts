import { q } from "@/lib/db";
import { handler, STAFF } from "@/lib/server";

// Foto del estado operativo: la consola la consulta cada pocos segundos.
export const GET = handler(STAFF, async () => {
  const [incidents, units, cameras] = await Promise.all([
    q(`select i.*, u.code as unit_code, u.agency as unit_agency
       from incidents i left join units u on u.id = i.unit_id
       where i.status not in ('cerrado','cancelado') or i.closed_at > now() - interval '12 hours'
       order by i.created_at desc limit 500`),
    q("select * from units order by agency, code"),
    q("select * from cameras where active order by name"),
  ]);
  return { now: new Date().toISOString(), incidents, units, cameras };
});
