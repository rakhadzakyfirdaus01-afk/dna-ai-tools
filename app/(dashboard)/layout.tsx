import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import AppLayout from "@/components/layout/app-layout";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const session = await getServerSession(authOptions);


  if (!session) {
    redirect("/login");
  }


  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}