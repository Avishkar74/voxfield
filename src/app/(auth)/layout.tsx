import { Providers } from "@/app/providers";

export const metadata = {
  title: "Sign in | VoxField AI",
  description: "Sign in to VoxField AI",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
