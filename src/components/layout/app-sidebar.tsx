"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Landmark,
  Home,
  FileText,
  Users,
  CreditCard,
  BarChart3,
  Sparkles,
  Settings,
  Receipt,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    group: "Vue d'ensemble",
    items: [{ label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Patrimoine",
    items: [
      { label: "Entités juridiques", href: "/entities", icon: Landmark },
      { label: "Actifs", href: "/assets", icon: Home },
    ],
  },
  {
    group: "Gestion locative",
    items: [
      { label: "Baux", href: "/leases", icon: FileText },
      { label: "Locataires", href: "/tenants", icon: Users },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Transactions", href: "/transactions", icon: Receipt },
      { label: "Emprunts", href: "/loans", icon: CreditCard },
    ],
  },
  {
    group: "Outils",
    items: [
      { label: "Rapports", href: "/reports", icon: BarChart3 },
      { label: "Assistant IA", href: "/ai", icon: Sparkles },
    ],
  },
  {
    group: "Compte",
    items: [
      { label: "Abonnement", href: "/billing", icon: CreditCard },
      { label: "Paramètres", href: "/settings", icon: Settings },
      { label: "Mon profil", href: "/profile", icon: UserCircle },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="scrollbar-hide flex h-screen w-64 flex-shrink-0 flex-col overflow-y-auto bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <Building2 className="h-6 w-6 text-sidebar-primary" />
        <span className="text-lg font-bold text-white">PatrimNet</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {NAV_ITEMS.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.group}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <p className="text-[11px] text-sidebar-foreground/30">PatrimNet Beta v0.1</p>
      </div>
    </aside>
  );
}
