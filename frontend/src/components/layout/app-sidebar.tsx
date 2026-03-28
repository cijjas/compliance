"use client";

import {
  Building2,
  FileText,
  Users,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { label: "Companies", href: "/", icon: Building2 },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Users", href: "/users", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

const footerItems = [
  { label: "Support", href: "/support", icon: HelpCircle },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar className="bg-surface-container-low" style={{ borderRight: "none" }}>
      <SidebarHeader className="px-5 pt-6 pb-4">
        <div>
          <span
            className="text-lg font-bold tracking-tight text-primary"
            style={{ fontFamily: "var(--font-outfit)" }}
          >
            Complif HQ
          </span>
          <p className="text-label-caps text-on-surface-variant mt-0.5" style={{ fontSize: "0.625rem" }}>
            Compliance Ledger
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-[rgba(33,99,132,0.08)] text-primary font-medium"
                          : "text-on-surface-variant hover:bg-[rgba(33,99,132,0.04)] hover:text-on-surface"
                      }
                      render={<Link href={item.href} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-4">
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                className="text-on-surface-variant hover:bg-[rgba(33,99,132,0.04)] hover:text-on-surface"
                render={<Link href={item.href} />}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="text-on-surface-variant hover:bg-[rgba(33,99,132,0.04)] hover:text-on-surface cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
