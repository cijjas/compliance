import { BusinessStatus } from "@/lib/types";

export const STATUS_LABELS: Record<BusinessStatus, string> = {
  [BusinessStatus.PENDING]: "Pending",
  [BusinessStatus.IN_REVIEW]: "In Review",
  [BusinessStatus.APPROVED]: "Approved",
  [BusinessStatus.REJECTED]: "Rejected",
};

export const COUNTRY_OPTIONS = [
  { value: "AR", label: "Argentina" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "ES", label: "Spain" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "UY", label: "Uruguay" },
  { value: "PE", label: "Peru" },
] as const;

export const COUNTRY_LABELS: Record<string, string> = Object.fromEntries(
  COUNTRY_OPTIONS.map((c) => [c.value, c.label]),
);
