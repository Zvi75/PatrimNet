"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  analyst: "Analyste",
  "read-only": "Lecture seule",
};

interface AppHeaderProps {
  workspaceName?: string;
  role?: UserRole;
}

export function AppHeader({ workspaceName, role }: AppHeaderProps) {
  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        {workspaceName && (
          <span className="text-sm font-medium text-slate-700">{workspaceName}</span>
        )}
        {role && (
          <Badge variant="secondary" className="text-xs font-normal">
            {ROLE_LABELS[role]}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-slate-500">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
