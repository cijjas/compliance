import { Repository } from 'typeorm';
import {
  Business,
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
  RiskSettingKey,
} from '../common/entities';
import { DocumentType } from '../common/enums';
import { RiskAssessmentService } from './risk-assessment.service';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let countryPolicyRepo: jest.Mocked<Pick<Repository<CountryPolicy>, 'find'>>;
  let industryPolicyRepo: jest.Mocked<Pick<Repository<IndustryPolicy>, 'find'>>;
  let riskSettingRepo: jest.Mocked<Pick<Repository<RiskSetting>, 'find'>>;

  beforeEach(() => {
    countryPolicyRepo = {
      find: jest.fn().mockResolvedValue([
        { code: 'AR', riskPoints: 0 },
        { code: 'CU', riskPoints: 30 },
      ]),
    };
    industryPolicyRepo = {
      find: jest.fn().mockResolvedValue([
        { key: 'technology', riskPoints: 0 },
        { key: 'casino', riskPoints: 25 },
      ]),
    };
    riskSettingRepo = {
      find: jest.fn().mockResolvedValue([
        {
          key: RiskSettingKey.DOCUMENTATION_RISK_POINTS,
          numericValue: 20,
        },
        {
          key: RiskSettingKey.MANUAL_REVIEW_THRESHOLD,
          numericValue: 70,
        },
      ]),
    };

    service = new RiskAssessmentService(
      {} as Repository<Business>,
      countryPolicyRepo as unknown as Repository<CountryPolicy>,
      industryPolicyRepo as unknown as Repository<IndustryPolicy>,
      riskSettingRepo as unknown as Repository<RiskSetting>,
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

  it('does not trigger manual review when the score lands exactly on the threshold', async () => {
    countryPolicyRepo.find.mockResolvedValue([
      { code: 'VE', riskPoints: 45 } as CountryPolicy,
    ]);
    industryPolicyRepo.find.mockResolvedValue([
      { key: 'security', riskPoints: 25 } as IndustryPolicy,
    ]);

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
    expect(assessment.requiresManualReview).toBe(false);
  });
});
