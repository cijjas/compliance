import { Repository } from 'typeorm';
import { Business } from '../common/entities';
import { DocumentType } from '../common/enums';
import { BusinessRiskService } from './business-risk.service';

describe('BusinessRiskService', () => {
  let service: BusinessRiskService;

  beforeEach(() => {
    service = new BusinessRiskService({} as Repository<Business>);
  });

  it('returns zero risk for a validated low-risk business with all required documents', () => {
    const assessment = service.calculateAssessment({
      country: 'AR',
      industry: 'technology',
      documentTypes: [
        DocumentType.FISCAL_CERTIFICATE,
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });

    expect(assessment).toEqual({
      score: 0,
      requiresManualReview: false,
      breakdown: {
        countryRisk: 0,
        industryRisk: 0,
        documentationRisk: 0,
        missingDocumentTypes: [],
      },
    });
  });

  it('marks high-risk businesses for manual review and reports missing documents', () => {
    const assessment = service.calculateAssessment({
      country: 'CU',
      industry: 'casino',
      documentTypes: [DocumentType.FISCAL_CERTIFICATE],
    });

    expect(assessment.score).toBe(75);
    expect(assessment.requiresManualReview).toBe(true);
    expect(assessment.breakdown).toEqual({
      countryRisk: 30,
      industryRisk: 25,
      documentationRisk: 20,
      missingDocumentTypes: [
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });
  });

  it('applies the documentation penalty only once even when multiple required files are missing', () => {
    const assessment = service.calculateAssessment({
      country: 'AR',
      industry: 'technology',
      documentTypes: [],
    });

    expect(assessment.score).toBe(20);
    expect(assessment.requiresManualReview).toBe(false);
    expect(assessment.breakdown).toEqual({
      countryRisk: 0,
      industryRisk: 0,
      documentationRisk: 20,
      missingDocumentTypes: [
        DocumentType.FISCAL_CERTIFICATE,
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });
  });
});
