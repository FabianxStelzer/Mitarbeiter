import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === UserRole.CANDIDATE) {
    redirect("/dashboard/candidate");
  }

  redirect("/dashboard/company");
}
