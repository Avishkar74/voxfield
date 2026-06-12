import { Providers } from "@/app/providers";

export const metadata = {
  title: "Dashboard | VoxField AI",
  description: "Protected VoxField AI dashboard",
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-full flex-1 flex-col bg-slate-50 dark:bg-black">
        {children}
      </div>
    </Providers>
  );
}
