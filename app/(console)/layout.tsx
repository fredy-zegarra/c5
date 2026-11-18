import { redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { currentUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await currentUser();
  if (me?.role === "unidad") redirect("/unidad");
  return <Shell me={me ?? { id: 0, email: "", name: "Modo demostración", role: "demo", unit_id: null }}>{children}</Shell>;
}
