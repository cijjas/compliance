import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const COMPANY_AVATAR_PALETTES = [
  {
    bg: "bg-sky-500/12",
    text: "text-sky-700 dark:text-sky-200",
    border: "border-sky-500/15",
  },
  {
    bg: "bg-cyan-500/12",
    text: "text-cyan-700 dark:text-cyan-200",
    border: "border-cyan-500/15",
  },
  {
    bg: "bg-teal-500/12",
    text: "text-teal-700 dark:text-teal-200",
    border: "border-teal-500/15",
  },
  {
    bg: "bg-emerald-500/12",
    text: "text-emerald-700 dark:text-emerald-200",
    border: "border-emerald-500/15",
  },
  {
    bg: "bg-indigo-500/12",
    text: "text-indigo-700 dark:text-indigo-200",
    border: "border-indigo-500/15",
  },
  {
    bg: "bg-slate-500/12",
    text: "text-slate-700 dark:text-slate-200",
    border: "border-slate-500/15",
  },
] as const;

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "?";
}

function getPaletteIndex(name: string) {
  return Array.from(name.trim()).reduce(
    (hash, char) =>
      (hash * 31 + char.charCodeAt(0)) % COMPANY_AVATAR_PALETTES.length,
    0,
  );
}

type CompanyAvatarProps = {
  name: string;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function CompanyAvatar({
  name,
  className,
  size = "default",
}: CompanyAvatarProps) {
  const palette = COMPANY_AVATAR_PALETTES[getPaletteIndex(name)];

  return (
    <Avatar
      size={size}
      className={cn("ring-1 ring-black/5 dark:ring-white/10", className)}
    >
      <AvatarFallback
        className={cn(
          "border font-semibold tracking-tight",
          palette.bg,
          palette.text,
          palette.border,
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
