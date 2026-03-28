import { Badge } from "@/components/ui/badge";
import { BusinessStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

const STATUS_VARIANT: Record<
  BusinessStatus,
  "default" | "secondary" | "destructive" | "success"
> = {
  [BusinessStatus.PENDING]: "secondary",
  [BusinessStatus.IN_REVIEW]: "default",
  [BusinessStatus.APPROVED]: "success",
  [BusinessStatus.REJECTED]: "destructive",
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
  );
}
