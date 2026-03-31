import { cn } from "@/lib/utils";

function normalizeCountryCode(code: string) {
  return code.trim().toUpperCase();
}

type CountryFlagProps = {
  code: string;
  className?: string;
  decorative?: boolean;
};

export function CountryFlag({
  code,
  className,
  decorative = true,
}: CountryFlagProps) {
  const normalizedCode = normalizeCountryCode(code);

  if (!normalizedCode || normalizedCode === "ALL") {
    return null;
  }

  const label = normalizedCode;

  return (
    <span
      className={cn(
        "fi shrink-0 overflow-hidden rounded-[3px] text-[13px] leading-none ring-1 ring-black/10 dark:ring-white/10",
        `fi-${normalizedCode.toLowerCase()}`,
        className,
      )}
      aria-hidden={decorative}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
      title={label}
    />
  );
}

type CountryLabelProps = {
  code: string;
  label?: string;
  className?: string;
  flagClassName?: string;
  textClassName?: string;
};

export function CountryLabel({
  code,
  label,
  className,
  flagClassName,
  textClassName,
}: CountryLabelProps) {
  const normalizedCode = normalizeCountryCode(code);
  const resolvedLabel = label ?? normalizedCode;

  if (!normalizedCode || normalizedCode === "ALL") {
    return <span className={cn(className, textClassName)}>{resolvedLabel}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CountryFlag code={normalizedCode} className={flagClassName} />
      <span className={cn("min-w-0", textClassName)}>{resolvedLabel}</span>
    </span>
  );
}
