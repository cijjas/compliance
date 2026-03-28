"use client";

import { Bell, HelpCircle, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/constants";

export function TopBar() {
  const { user } = useAuth();
  const name = user ? `${user.firstName} ${user.lastName}` : "";

  return (
    <header className="flex items-center justify-between h-14 px-6 bg-surface-container-lowest">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-on-surface-variant" />
        <span
          className="text-base font-semibold text-on-surface hidden sm:block"
          style={{ fontFamily: "var(--font-outfit)" }}
        >
          Complif
        </span>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-on-surface-variant" />
          <Input
            placeholder="Quick search..."
            className="pl-9 w-64 h-8 text-sm bg-surface-container-low border-none focus:bg-surface-container-lowest"
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" className="text-on-surface-variant">
          <Bell className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" className="text-on-surface-variant">
          <HelpCircle className="size-4" />
        </Button>
        <Avatar className="size-8 ml-2 bg-primary-gradient text-primary-foreground">
          <AvatarFallback className="bg-primary-gradient text-primary-foreground text-xs font-medium">
            {getInitials(name || "U")}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
