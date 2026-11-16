import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function UnidadLayout({ children }: { children: React.ReactNode }) {
  if (!(await currentUser())) redirect("/login");
  return children;
}
