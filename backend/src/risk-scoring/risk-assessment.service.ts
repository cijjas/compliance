import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  Business,
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
  RiskSettingKey,
  RiskAssessmentRecord,
} from '../common/entities';
import {
  RiskAssessment,
  RiskInput,
  RiskPolicySnapshot,
  REQUIRED_DOCUMENT_TYPES,
  calculateRiskAssessment,
} from './risk-assessment.policy';

@Injectable()
export class RiskAssessmentService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(CountryPolicy)
    private readonly countryPolicyRepo: Repository<CountryPolicy>,
    @InjectRepository(IndustryPolicy)
    private readonly industryPolicyRepo: Repository<IndustryPolicy>,
    @InjectRepository(RiskSetting)
    private readonly riskSettingRepo: Repository<RiskSetting>,
    @InjectRepository(RiskAssessmentRecord)
    private readonly riskAssessmentRecordRepo: Repository<RiskAssessmentRecord>,
  ) {}

  async refreshBusinessRiskScore(
    businessId: string,
  ): Promise<RiskAssessment> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      relations: ['documents'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const snapshot = await this.loadPolicySnapshot();
    const assessment = calculateRiskAssessment(
      {
        country: business.country,
        industry: business.industry,
        documentTypes: business.documents.map((document) => document.type),
      },
      snapshot,
    );

    business.riskScore = assessment.score;
    await this.businessRepo.save(business);

    await this.riskAssessmentRecordRepo.save({
      businessId,
      score: assessment.score,
      requiresManualReview: assessment.requiresManualReview,
      countryRisk: assessment.breakdown.countryRisk,
      industryRisk: assessment.breakdown.industryRisk,
      documentationRisk: assessment.breakdown.documentationRisk,
      missingDocumentTypes: assessment.breakdown.missingDocumentTypes,
      policyVersion: snapshot.version,
    });

    return assessment;
  }

  async calculateAssessment(input: RiskInput): Promise<RiskAssessment> {
    const snapshot = await this.loadPolicySnapshot();
    return calculateRiskAssessment(input, snapshot);
  }

  private async loadPolicySnapshot(): Promise<RiskPolicySnapshot> {
    const [countries, industries, settings] = await Promise.all([
      this.countryPolicyRepo.find({ where: { isActive: true } }),
      this.industryPolicyRepo.find({ where: { isActive: true } }),
      this.riskSettingRepo.find(),
    ]);

    const countryRiskPointsByCode = new Map(
      countries.map((country) => [country.code, country.riskPoints]),
    );
    const industryRiskPointsByKey = new Map(
      industries.map((industry) => [industry.key, industry.riskPoints]),
    );
    const documentationRiskPoints = this.getRequiredSetting(
      settings,
      RiskSettingKey.DOCUMENTATION_RISK_POINTS,
    );
    const manualReviewThreshold = this.getRequiredSetting(
      settings,
      RiskSettingKey.MANUAL_REVIEW_THRESHOLD,
    );

    const versionPayload = JSON.stringify({
      countries: [...countryRiskPointsByCode.entries()].sort(),
      industries: [...industryRiskPointsByKey.entries()].sort(),
      documentationRiskPoints,
      manualReviewThreshold,
      requiredDocumentTypes: REQUIRED_DOCUMENT_TYPES,
    });
    const version = createHash('sha256')
      .update(versionPayload)
      .digest('hex')
      .slice(0, 16);

    return {
      countryRiskPointsByCode,
      industryRiskPointsByKey,
      documentationRiskPoints,
      manualReviewThreshold,
      requiredDocumentTypes: REQUIRED_DOCUMENT_TYPES,
      version,
    };
  }

  private getRequiredSetting(
    settings: RiskSetting[],
    key: RiskSettingKey,
  ): number {
    const match = settings.find((setting) => setting.key === key);

    if (!match) {
      throw new InternalServerErrorException(
        `Compliance risk setting "${key}" is missing.`,
      );
    }

    return match.numericValue;
  }
}
