import { UserRole } from "@/lib/types";
import type { User } from "@/lib/types";

type UserWithRole = Pick<User, "role"> | null | undefined;

export function canManageComplianceRecords(user: UserWithRole) {
  return user?.role === UserRole.ADMIN;
}
