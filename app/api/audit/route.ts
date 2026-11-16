import { q } from "@/lib/db";
import { handler, MANAGERS } from "@/lib/server";

export const GET = handler(MANAGERS, async ({ req }) => {
  const s = req.nextUrl.searchParams.get("q")?.trim();
  if (s) {
    return q(
      `select * from audit_log where user_email ilike $1 or action ilike $1 or entity_id ilike $1 or detail ilike $1
       order by created_at desc, id desc limit 500`,
      [`%${s}%`]
    );
  }
  return q("select * from audit_log order by created_at desc, id desc limit 500");
});
