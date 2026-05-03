import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarWrapper } from "@/components/features/layout/SidebarWrapper";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="flex h-screen" style={{ background: "var(--bg)" }}>
      <SidebarWrapper user={session.user} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
