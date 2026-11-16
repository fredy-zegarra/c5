import { q } from "@/lib/db";
import { handler, STAFF } from "@/lib/server";

// Estadísticas calculadas únicamente con los incidentes registrados en este sistema.
export const GET = handler(STAFF, async ({ req }) => {
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 30));
  const W = "created_at >= now() - make_interval(days => $1::int)";
  const [totals, byType, byDistrict, byHour, byDay, byPriority, points] = await Promise.all([
    q(`select count(*)::int as total,
         (count(*) filter (where status not in ('cerrado','cancelado')))::int as abiertos,
         (count(*) filter (where status = 'cerrado'))::int as cerrados,
         (avg(extract(epoch from dispatched_at - created_at)) filter (where dispatched_at is not null))::float8 as t_despacho,
         (avg(extract(epoch from arrived_at - created_at)) filter (where arrived_at is not null))::float8 as t_llegada,
         (avg(extract(epoch from closed_at - created_at)) filter (where status = 'cerrado'))::float8 as t_cierre
       from incidents where ${W}`, [days]),
    q(`select type as k, count(*)::int as n from incidents where ${W} group by 1 order by 2 desc`, [days]),
    q(`select coalesce(district, 'Sin distrito') as k, count(*)::int as n from incidents where ${W} group by 1 order by 2 desc`, [days]),
    q(`select extract(hour from created_at at time zone 'America/Lima')::int as k, count(*)::int as n from incidents where ${W} group by 1 order by 1`, [days]),
    q(`select to_char(created_at at time zone 'America/Lima', 'YYYY-MM-DD') as k, count(*)::int as n from incidents where ${W} group by 1 order by 1`, [days]),
    q(`select priority as k, count(*)::int as n from incidents where ${W} group by 1 order by 1`, [days]),
    q(`select lat, lng, priority from incidents where ${W} order by created_at desc limit 5000`, [days]),
  ]);
  return { days, totals: totals[0], byType, byDistrict, byHour, byDay, byPriority, points };
});
