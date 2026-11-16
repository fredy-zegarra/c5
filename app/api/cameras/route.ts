import { q } from "@/lib/db";
import { audit, handler, MANAGERS, STAFF } from "@/lib/server";
import { CamBody } from "@/lib/schemas";

export const GET = handler(STAFF, async () => q("select * from cameras order by name"));

export const POST = handler(MANAGERS, async ({ req, user }) => {
  const b = CamBody.parse(await req.json());
  const [c] = await q(
    "insert into cameras (name, district, address, lat, lng, stream_url, stream_type, active) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *",
    [b.name, b.district ?? null, b.address || null, b.lat, b.lng, b.stream_url || null, b.stream_type, b.active]
  );
  await audit(req, user, "camara_creada", "camera", c.id, { name: b.name });
  return c;
});
