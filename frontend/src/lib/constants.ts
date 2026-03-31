import { BusinessStatus } from "@/lib/types";

export const STATUS_LABELS: Record<BusinessStatus, string> = {
  [BusinessStatus.PENDING]: "Pending",
  [BusinessStatus.IN_REVIEW]: "In Review",
  [BusinessStatus.APPROVED]: "Approved",
  [BusinessStatus.REJECTED]: "Rejected",
};
