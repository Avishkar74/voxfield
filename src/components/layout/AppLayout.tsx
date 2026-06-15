"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Mic, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Bell, 
  Wrench, 
  ClipboardCheck, 
  Laptop, 
  ShieldAlert, 
  History, 
  FileBarChart2,
  ChevronDown,
  User,
  AlertTriangle
} from "lucide-react";
import { AuthenticatedRequestUser } from "@/lib/api/middleware";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/use-auth";

const OfflineStatus = dynamic(
  () => import("@/components/dashboard/OfflineStatus").then((m) => m.OfflineStatus),
  { ssr: false }
);

interface AppLayoutProps {
  children: ReactNode;
  user: AuthenticatedRequestUser;
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, isLoading: isSigningOut } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isTechnician = user.role === "TECHNICIAN";

  // Sidebar links based on user role matching the visual design reference
  const navLinks = isTechnician
    ? [
        { name: "Dashboard", href: "/technician", icon: LayoutDashboard },
        { name: "Work Orders", href: "#work-orders", icon: Wrench },
        { name: "Inspections", href: "#inspections", icon: ClipboardCheck },
        { name: "Equipment", href: "#equipment", icon: Laptop },
        { name: "Activity", href: "#activity", icon: History },
      ]
    : [
        { name: "Dashboard", href: "/supervisor", icon: LayoutDashboard },
        { name: "Work Orders", href: "#work-orders", icon: Wrench },
        { name: "Inspections", href: "#inspections", icon: ClipboardCheck },
        { name: "Equipment", href: "#equipment", icon: Laptop },
        { name: "Alerts", href: "#alerts", icon: ShieldAlert },
        { name: "Activity", href: "#activity", icon: History },
        { name: "Reports", href: "#reports", icon: FileBarChart2 },
      ];

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleLinkClick = (e: React.MouseEvent, href: string, name: string) => {
    if (href.startsWith("#")) {
      // If it's a mock navigation element not implemented on this page, show a friendly warning toast
      if (href === "#equipment" || href === "#reports") {
        e.preventDefault();
        setToastMessage(`${name} module is under development and will be available in the next release.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#1C1A17] flex flex-col md:flex-row font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-[#1C1A17] text-white border border-[#2E2B27] px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-sm animate-bounce">
          <AlertTriangle className="w-5 h-5 text-[#D14923]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar for Desktop */}
      <nav className="hidden md:flex w-64 bg-[#1C1A17] text-white border-r border-[#2B2824] flex-col justify-between sticky top-0 h-screen z-20">
        <div>
          {/* Logo Brand area */}
          <div className="p-6 flex items-center space-x-3">
            <div className="bg-[#D14923] p-2 rounded-xl text-white">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">VoxField</span>
          </div>
          
          {/* Nav list */}
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              // Link is active if pathname equals href, or if page uses a hash scroll
              const isActive = pathname === link.href || (link.href.startsWith("#") && pathname + link.href === pathname + pathname); // dummy logic, active default is pathname matching
              
              const displayActive = link.name === "Dashboard" && (pathname === "/technician" || pathname === "/supervisor");

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href, link.name)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    displayActive
                      ? "bg-[#D14923] text-white font-medium shadow-md shadow-[#D14923]/10"
                      : "text-[#A3A3A3] hover:bg-[#2B2824] hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-4">
          {/* System Online Status Box */}
          <div className="bg-[#262421] border border-[#2E2B27] rounded-xl p-3 flex flex-col space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-semibold text-white uppercase tracking-wider">System Online</span>
            </div>
            <p className="text-[10px] text-[#A3A3A3]">All systems operational</p>
          </div>

          {/* User Profile popover container */}
          <div className="border-t border-[#2B2824] pt-4 flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-[#D14923] flex items-center justify-center text-white font-bold border border-[#2E2B27]">
                {user.fullName?.[0] || user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.fullName || "User"}
                </p>
                <p className="text-xs text-[#A3A3A3] uppercase tracking-wider font-medium">
                  {isTechnician ? "Technician" : "Supervisor"}
                </p>
              </div>
            </div>
            
            {/* Quick action buttons */}
            <button 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 bg-[#262421] hover:bg-[#2B2824] rounded-xl transition-all border border-[#2E2B27]"
            >
              <LogOut className="w-4 h-4" />
              <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Header and navigation for Mobile */}
      <header className="md:hidden bg-[#1C1A17] text-white border-b border-[#2B2824] sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="bg-[#D14923] p-1.5 rounded-lg text-white">
            <Mic className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold">VoxField</span>
        </div>
        
        {/* Sign out for mobile */}
        <button 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-red-400 p-2 hover:bg-[#262421] rounded-lg transition-colors flex items-center space-x-1"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-semibold">Sign out</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-8 flex flex-col space-y-6">
        
        {/* Dynamic Top bar matching header visual reference */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-gray-200 pb-4 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1C1A17] tracking-tight">
              Good morning, {user.fullName?.split(" ")[0] || "Avishkar"} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              How can I help you today?
            </p>
          </div>

          <div className="flex items-center space-x-4 self-end md:self-auto">
            {/* Offline Sync and connection indicator */}
            <OfflineStatus />

            {/* Notification Bell with Badge */}
            <div className="relative">
              <button className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm text-gray-700">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#D14923] rounded-full border-2 border-white"></span>
              </button>
            </div>

            {/* User profile dropdown button at top right */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition text-sm font-semibold"
              >
                <div className="w-7 h-7 rounded-full bg-[#D14923] flex items-center justify-center text-white text-xs font-bold">
                  {user.fullName?.[0] || user.email[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline text-gray-800">{isTechnician ? "Technician" : "Supervisor"}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 text-xs">
                    <p className="font-semibold text-gray-900">{user.fullName}</p>
                    <p className="text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard page components wrapped in a flex grid */}
        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Menu */}
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around py-3 px-4 z-20 pb-safe shadow-lg">
        {navLinks.filter(link => link.name === "Dashboard" || link.name === "Work Orders" || link.name === "Inspections").map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.name} 
              href={link.href} 
              onClick={(e) => handleLinkClick(e, link.href, link.name)}
              className={`flex flex-col items-center space-y-1 ${isActive ? "text-[#D14923]" : "text-gray-400"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{link.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
