import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-manifest-bg">
      <Sidebar email={user?.email} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
