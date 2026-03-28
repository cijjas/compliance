export type BusinessStatus = "pending" | "in_review" | "approved" | "rejected";
export type UserRole = "admin" | "viewer";
export type DocumentType =
  | "fiscal_certificate"
  | "registration_proof"
  | "insurance_policy"
  | "other";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  taxIdentifier: string;
  country: string;
  industry: string;
  status: BusinessStatus;
  riskScore: number | null;
  identifierValidated: boolean;
  createdBy: User | null;
  createdById: string | null;
  documents: Document[];
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  businessId: string;
  type: DocumentType;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  businessId: string;
  previousStatus: BusinessStatus | null;
  newStatus: BusinessStatus;
  reason: string | null;
  changedBy: User | null;
  changedById: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  user: Pick<User, "id" | "email" | "firstName" | "lastName" | "role">;
}

export interface RiskScoreResponse {
  businessId: string;
  score: number;
  requiresManualReview: boolean;
  breakdown: {
    countryRisk: number;
    industryRisk: number;
    documentationRisk: number;
    identifierRisk: number;
  };
}
