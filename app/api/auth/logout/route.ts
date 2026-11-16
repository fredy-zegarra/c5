import { audit, currentUser, destroySession, handler } from "@/lib/server";

export const POST = handler("public", async ({ req }) => {
  const u = await currentUser();
  await destroySession();
  if (u) await audit(req, u, "logout", "user", u.id);
  return { ok: true };
});
