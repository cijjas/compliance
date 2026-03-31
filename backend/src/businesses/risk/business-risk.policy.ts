import { DocumentType } from '../../common/enums';
import type { BusinessRiskPolicySnapshot } from '../reference-data.service';

export interface CalculateBusinessRiskInput {
  country: string;
  industry: string;
  documentTypes: DocumentType[];
}

export interface BusinessRiskAssessment {
  score: number;
  requiresManualReview: boolean;
  breakdown: {
    countryRisk: number;
    industryRisk: number;
    documentationRisk: number;
    missingDocumentTypes: DocumentType[];
  };
}

export const REQUIRED_DOCUMENT_TYPES: readonly DocumentType[] = [
  DocumentType.FISCAL_CERTIFICATE,
  DocumentType.REGISTRATION_PROOF,
  DocumentType.INSURANCE_POLICY,
];

export function calculateBusinessRiskAssessment(
  input: CalculateBusinessRiskInput,
  policy: BusinessRiskPolicySnapshot,
): BusinessRiskAssessment {
  const normalizedCountry = input.country.toUpperCase();
  const normalizedIndustry = input.industry.trim().toLowerCase();
  const missingDocumentTypes = policy.requiredDocumentTypes.filter(
    (documentType) => !input.documentTypes.includes(documentType),
  );
  const countryRisk =
    policy.countryRiskPointsByCode.get(normalizedCountry) ?? 0;
  const industryRisk =
    policy.industryRiskPointsByKey.get(normalizedIndustry) ?? 0;

  const breakdown = {
    countryRisk,
    industryRisk,
    documentationRisk:
      missingDocumentTypes.length > 0 ? policy.documentationRiskPoints : 0,
    missingDocumentTypes,
  };

  const score = Math.min(
    breakdown.countryRisk +
      breakdown.industryRisk +
      breakdown.documentationRisk,
    100,
  );

  return {
    score,
    requiresManualReview: score >= policy.manualReviewThreshold,
    breakdown,
  };
}
