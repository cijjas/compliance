import { Badge } from "@/components/ui/badge";
import { BusinessStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

const STATUS_VARIANT: Record<
  BusinessStatus,
  "default" | "secondary" | "destructive" | "success" | "warning"
> = {
  [BusinessStatus.PENDING]: "warning",
  [BusinessStatus.IN_REVIEW]: "default",
  [BusinessStatus.APPROVED]: "success",
  [BusinessStatus.REJECTED]: "destructive",
};

export function getStatusBadgeVariant(status: BusinessStatus) {
  return STATUS_VARIANT[status];
}

export function StatusBadge({ status }: { status: BusinessStatus }) {
  return <Badge variant={getStatusBadgeVariant(status)}>{STATUS_LABELS[status]}</Badge>;
}
