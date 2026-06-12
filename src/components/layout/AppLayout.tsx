"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic, LayoutDashboard, Settings, LogOut, Bell } from "lucide-react";
import { AuthenticatedRequestUser } from "@/lib/api/middleware";

interface AppLayoutProps {
  children: ReactNode;
  user: AuthenticatedRequestUser;
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const pathname = usePathname();

  const isTechnician = user.role === "TECHNICIAN";
  const navLinks = [
    { name: "Dashboard", href: isTechnician ? "/technician" : "/supervisor", icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop / Header for Mobile */}
      <nav className="w-full md:w-64 bg-white dark:bg-gray-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col justify-between sticky top-0 md:h-screen z-10">
        <div>
          <div className="p-4 flex items-center justify-between md:justify-start space-x-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Mic className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              VoxField
            </h1>
            <div className="md:hidden flex items-center">
              <button className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
          
          <div className="hidden md:block px-4 py-6 space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Menu</p>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden md:block p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user.fullName?.[0] || user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user.fullName || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <button className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-x-hidden p-4 md:p-8 bg-gray-50 dark:bg-gray-950 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around py-3 px-6 z-20 pb-safe">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.name} href={link.href} className={`flex flex-col items-center space-y-1 ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{link.name}</span>
            </Link>
          );
        })}
        <button className="flex flex-col items-center space-y-1 text-gray-500">
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
