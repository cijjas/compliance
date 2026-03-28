export enum BusinessStatus {
  PENDING = "pending",
  IN_REVIEW = "in_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum UserRole {
  ADMIN = "admin",
  VIEWER = "viewer",
}

export enum DocumentType {
  FISCAL_CERTIFICATE = "fiscal_certificate",
  REGISTRATION_PROOF = "registration_proof",
  INSURANCE_POLICY = "insurance_policy",
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
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
  changedBy: Pick<User, "id" | "firstName" | "lastName"> | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface BusinessStats {
  total: number;
  byStatus: Record<string, number>;
  avgApprovalDays: number | null;
  complianceRate: number | null;
}

export interface BusinessRiskBreakdown {
  countryRisk: number;
  industryRisk: number;
  documentationRisk: number;
  missingDocumentTypes: DocumentType[];
}

export interface BusinessRiskAssessment {
  businessId: string;
  score: number;
  requiresManualReview: boolean;
  breakdown: BusinessRiskBreakdown;
}
