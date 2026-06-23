"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  LayoutDashboard,
  LogOut,
  Wrench,
  ClipboardCheck,
  ShieldAlert,
  History,
  FileBarChart2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  MessageSquare,
} from "lucide-react";
import { AuthenticatedRequestUser } from "@/lib/api/middleware";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";

const OfflineStatus = dynamic(
  () => import("@/components/dashboard/OfflineStatus").then((m) => m.OfflineStatus),
  { ssr: false },
);

interface AppLayoutProps {
  children: ReactNode;
  user: AuthenticatedRequestUser;
}

interface NavLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Notification {
  id: string;
  type: string;
  severity: string;
  message: string;
  targetUrl: string;
  read: boolean;
  createdAt: string;
}


  export function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] =
  useState<Notification[]>([]);
  const [currentHash, setCurrentHash] = useState("");
  const router = useRouter();
  const { signOut, isLoading: isSigningOut } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
   const [showNotifications, setShowNotifications] = useState(false);

   const [readNotifications, setReadNotifications] = useState<string[]>([]);
  useEffect(() => {
  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications");

      const json = await res.json();

      setNotifications(json.data ?? []);
    } catch (err) {
      console.error(err);
    }
  }

  loadNotifications();
}, []);
  // Close drawer on route change
  useEffect(() => {
  setDrawerOpen(false);
  }, [pathname]);

// Track current URL hash (#work-orders, #alerts, etc.)
useEffect(() => {
  const updateHash = () => {
    setCurrentHash(window.location.hash);
  };

  // Initial value
  updateHash();

  // Listen for hash changes
  window.addEventListener("hashchange", updateHash);

  return () => {
    window.removeEventListener("hashchange", updateHash);
  };
}, []);


  // Automatically refresh dashboard data when background offline sync completes
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    import("@/lib/sync").then(({ subscribeToSyncCompletion }) => {
      unsubscribe = subscribeToSyncCompletion(() => {
        router.refresh();
      });
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isTechnician = user.role === "TECHNICIAN";

  // Technician nav — Equipment removed (not yet implemented)
  const navLinks: NavLink[] = isTechnician
    ? [
        { name: "Dashboard", href: "/technician", icon: LayoutDashboard },
        { name: "Work Orders", href: "/technician/work-orders", icon: Wrench },
        { name: "Inspections", href: "/technician/inspections", icon: ClipboardCheck },
        { name: "Activity", href: "/technician/activity", icon: History },
        { name: "Voice History", href: "/technician/voice-history", icon: MessageSquare },
      ]
    : [
        { name: "Dashboard", href: "/supervisor", icon: LayoutDashboard },
        { name: "Work Orders", href: "/supervisor/work-orders", icon: Wrench },
        { name: "Inspections", href: "/supervisor/inspections", icon: ClipboardCheck },
        { name: "Alerts", href: "/supervisor#alerts", icon: ShieldAlert },
        { name: "Voice History", href: "/supervisor/voice-history", icon: MessageSquare },
        { name: "Reports", href: "/supervisor/reports", icon: FileBarChart2 },
        { name: "Operations Log", href: "/supervisor/operations", icon: History },
      ];

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch {
      // ignore
    }
  };

const isLinkActive = (link: NavLink) => {
  // Dashboard
  if (link.name === "Dashboard") {
    const dashboardRoute = isTechnician
      ? "/technician"
      : "/supervisor";

    return pathname === dashboardRoute && currentHash === "";
  }

  // Hash-based sections
  if (link.href.includes("#")) {
    const [route, section] = link.href.split("#");

    return (
      pathname === route &&
      currentHash === `#${section}`
    );
  }

  // Normal pages like Operations Log
  return pathname === link.href;
};

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center ${collapsed && !mobile ? "justify-center px-3 py-5" : "px-5 py-5"} space-x-3`}>
        <div className="bg-[#D14923] p-2 rounded-xl text-white flex-shrink-0">
          <Mic className="w-5 h-5" />
        </div>
        {(!collapsed || mobile) && (
          <span className="text-xl font-bold tracking-tight text-white">VoxField</span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const active = isLinkActive(link);
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => {
  const hash = link.href.includes("#")
    ? `#${link.href.split("#")[1]}`
    : "";

  setCurrentHash(hash);

  if (mobile) setDrawerOpen(false);
}}
              title={collapsed && !mobile ? link.name : undefined}
              className={`flex items-center rounded-xl transition-all duration-200 group ${
                collapsed && !mobile
                  ? "justify-center px-2 py-3"
                  : "space-x-3 px-4 py-3"
              } ${
                active
                  ? "bg-[#D14923] text-white shadow-md shadow-[#D14923]/20"
                  : "text-[#A3A3A3] hover:bg-[#2B2824] hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : ""}`} />
              {(!collapsed || mobile) && (
                <span className="text-sm font-medium truncate">{link.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-[#2B2824] p-3 space-y-3`}>

        {/* User info */}
        <div className={`flex items-center ${collapsed && !mobile ? "justify-center" : "space-x-3"}`}>
          <div className="w-9 h-9 rounded-full bg-[#D14923] flex items-center justify-center text-white font-bold text-sm border border-[#2E2B27] flex-shrink-0">
            {user.fullName?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.fullName ?? "User"}</p>
              <p className="text-[10px] text-[#A3A3A3] uppercase tracking-wider font-medium">
                {isTechnician ? "Technician" : "Supervisor"}
              </p>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          title={collapsed && !mobile ? "Sign out" : undefined}
          className={`w-full flex items-center rounded-xl transition-all border border-[#2E2B27] text-red-400 hover:text-red-300 bg-[#262421] hover:bg-[#2B2824] text-sm font-medium ${
            collapsed && !mobile ? "justify-center px-2 py-2.5" : "space-x-2 justify-center px-3 py-2.5"
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || mobile) && (
            <span>{isSigningOut ? "Signing out…" : "Sign out"}</span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1A17] flex font-sans">
      {/* ───────── DESKTOP SIDEBAR ───────── */}
      <aside
        className={`hidden md:flex flex-col bg-[#1C1A17] border-r border-[#2B2824] sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[72px] z-30 w-6 h-6 rounded-full bg-[#D14923] border-2 border-[#1C1A17] flex items-center justify-center text-white shadow-md hover:bg-[#B73D1C] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        <SidebarContent />
      </aside>

      {/* ───────── MOBILE DRAWER OVERLAY ───────── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer panel */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 bg-[#1C1A17] border-r border-[#2B2824] transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Drawer close button */}
        <button
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[#262421] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <SidebarContent mobile />
      </div>

      {/* ───────── MAIN CONTENT ───────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden bg-[#1C1A17] text-white border-b border-[#2B2824] sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="p-2 rounded-lg hover:bg-[#262421] transition-colors"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-[#D14923] p-1.5 rounded-lg">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold">VoxField</span>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            aria-label="Sign out"
            className="p-2 rounded-lg hover:bg-[#262421] transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
          </button>
        </header>

        {/* Page header bar */}
        <div className="bg-white border-b border-gray-200 px-5 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {/* Operational header — not a consumer greeting */}
            <h1 className="text-lg md:text-xl font-extrabold text-[#1C1A17] tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Voice Assistant Ready
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 font-medium uppercase tracking-widest">
              System Online · {isTechnician ? "Technician View" : "Supervisor View"}
            </p>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <OfflineStatus />
<div className="relative">
  <button
    aria-label="Notifications"
    onClick={() => setShowNotifications(!showNotifications)}
    className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-700"
  >
    <div className="relative">
      <Bell className="w-4 h-4" />

{notifications.filter(n => !n.read).length > 0 && (
  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
    {notifications.filter(n => !n.read).length}
  </span>
)}
    </div>
  </button>

  {showNotifications && (
    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm">
          Notifications
        </h3>
      </div>

      <div className="max-h-72 overflow-y-auto">
{notifications.map((notification) => (
  <div
    key={notification.id}
    onClick={() => {
      setShowNotifications(false);
      router.push(notification.targetUrl);
    }}
    className="p-3 border-b hover:bg-gray-50 cursor-pointer transition"
  >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-semibold ${
                  notification.severity === "CRITICAL"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {notification.severity}
              </span>
            </div>

            <p className="text-sm text-gray-700">
              {notification.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
          </div>
        </div>

        {/* Content — extra bottom padding on mobile so the fixed bottom nav doesn't overlap content */}
        <main className="flex-1 p-4 sm:p-5 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-2 px-4 z-20 shadow-lg">
        {navLinks
          .filter((l) =>
            (isTechnician
              ? ["Dashboard", "Work Orders", "Inspections", "Voice History"]
              : ["Dashboard", "Work Orders", "Inspections", "Alerts"]
            ).includes(l.name),
          )
          .map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(link);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                  active ? "text-[#D14923]" : "text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-wide">{link.name}</span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
