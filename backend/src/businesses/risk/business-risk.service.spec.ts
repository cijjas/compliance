import { Repository } from 'typeorm';
import { Business } from '../../common/entities';
import { DocumentType } from '../../common/enums';
import { BusinessReferenceDataService } from '../reference-data.service';
import { BusinessRiskService } from './business-risk.service';

describe('BusinessRiskService', () => {
  let service: BusinessRiskService;
  let referenceDataService: jest.Mocked<
    Pick<BusinessReferenceDataService, 'getRiskPolicySnapshot'>
  >;

  beforeEach(() => {
    referenceDataService = {
      getRiskPolicySnapshot: jest.fn().mockResolvedValue({
        countryRiskPointsByCode: new Map([
          ['AR', 0],
          ['CU', 30],
        ]),
        industryRiskPointsByKey: new Map([
          ['technology', 0],
          ['casino', 25],
        ]),
        documentationRiskPoints: 20,
        manualReviewThreshold: 70,
        requiredDocumentTypes: [
          DocumentType.FISCAL_CERTIFICATE,
          DocumentType.REGISTRATION_PROOF,
          DocumentType.INSURANCE_POLICY,
        ],
      }),
    };

    service = new BusinessRiskService(
      {} as Repository<Business>,
      referenceDataService as unknown as BusinessReferenceDataService,
    );
  });

  it('returns zero risk for a validated low-risk business with all required documents', async () => {
    const assessment = await service.calculateAssessment({
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

  it('marks high-risk businesses for manual review and reports missing documents', async () => {
    const assessment = await service.calculateAssessment({
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

  it('applies the documentation penalty only once even when multiple required files are missing', async () => {
    const assessment = await service.calculateAssessment({
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

  it('treats the manual review threshold as inclusive', async () => {
    referenceDataService.getRiskPolicySnapshot.mockResolvedValue({
      countryRiskPointsByCode: new Map([['VE', 45]]),
      industryRiskPointsByKey: new Map([['security', 25]]),
      documentationRiskPoints: 20,
      manualReviewThreshold: 70,
      requiredDocumentTypes: [
        DocumentType.FISCAL_CERTIFICATE,
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });

    const assessment = await service.calculateAssessment({
      country: 'VE',
      industry: 'security',
      documentTypes: [
        DocumentType.FISCAL_CERTIFICATE,
        DocumentType.REGISTRATION_PROOF,
        DocumentType.INSURANCE_POLICY,
      ],
    });

    expect(assessment.score).toBe(70);
    expect(assessment.requiresManualReview).toBe(true);
  });
});
