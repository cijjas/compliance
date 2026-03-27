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
      identifierValidated: true,
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
        identifierRisk: 0,
        missingDocumentTypes: [],
      },
    });
  });

  it('marks high-risk businesses for manual review and reports missing documents', () => {
    const assessment = service.calculateAssessment({
      country: 'CU',
      industry: 'casino',
      identifierValidated: false,
      documentTypes: [DocumentType.FISCAL_CERTIFICATE],
    });

    expect(assessment.score).toBe(100);
    expect(assessment.requiresManualReview).toBe(true);
    expect(assessment.breakdown).toEqual({
      countryRisk: 30,
      industryRisk: 25,
      documentationRisk: 40,
      identifierRisk: 5,
      missingDocumentTypes: [
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });
  });
});
