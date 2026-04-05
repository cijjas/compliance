import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import {
  Business,
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
  RiskSettingKey,
  RiskAssessmentRecord,
} from '../common/entities';
import { getRequiredRiskSetting } from '../common/utils/risk-settings.util';
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
    private readonly dataSource: DataSource,
  ) {}

  async refreshBusinessRiskScore(businessId: string): Promise<RiskAssessment> {
    return this.dataSource.transaction(async (manager) => {
      const { business, assessment, snapshot } =
        await this.buildBusinessAssessment(
          businessId,
          manager.getRepository(Business),
          manager.getRepository(CountryPolicy),
          manager.getRepository(IndustryPolicy),
          manager.getRepository(RiskSetting),
        );

      business.riskScore = assessment.score;
      await manager.getRepository(Business).save(business);

      await manager.getRepository(RiskAssessmentRecord).save({
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
    });
  }

  async calculateBusinessAssessment(businessId: string): Promise<RiskAssessment> {
    const { assessment } = await this.buildBusinessAssessment(
      businessId,
      this.businessRepo,
      this.countryPolicyRepo,
      this.industryPolicyRepo,
      this.riskSettingRepo,
    );

    return assessment;
  }

  async calculateAssessment(input: RiskInput): Promise<RiskAssessment> {
    const snapshot = await this.loadPolicySnapshot(
      this.countryPolicyRepo,
      this.industryPolicyRepo,
      this.riskSettingRepo,
    );
    return calculateRiskAssessment(input, snapshot);
  }

  private async buildBusinessAssessment(
    businessId: string,
    businessRepo: Repository<Business>,
    countryPolicyRepo: Repository<CountryPolicy>,
    industryPolicyRepo: Repository<IndustryPolicy>,
    riskSettingRepo: Repository<RiskSetting>,
  ): Promise<{
    business: Business;
    assessment: RiskAssessment;
    snapshot: RiskPolicySnapshot;
  }> {
    const business = await businessRepo.findOne({
      where: { id: businessId },
      relations: ['documents'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const snapshot = await this.loadPolicySnapshot(
      countryPolicyRepo,
      industryPolicyRepo,
      riskSettingRepo,
    );
    const assessment = calculateRiskAssessment(
      {
        country: business.country,
        industry: business.industry,
        documentTypes: business.documents.map((document) => document.type),
      },
      snapshot,
    );

    return { business, assessment, snapshot };
  }

  private async loadPolicySnapshot(
    countryPolicyRepo: Repository<CountryPolicy>,
    industryPolicyRepo: Repository<IndustryPolicy>,
    riskSettingRepo: Repository<RiskSetting>,
  ): Promise<RiskPolicySnapshot> {
    const [countries, industries, settings] = await Promise.all([
      countryPolicyRepo.find({ where: { isActive: true } }),
      industryPolicyRepo.find({ where: { isActive: true } }),
      riskSettingRepo.find(),
    ]);

    const countryRiskPointsByCode = new Map(
      countries.map((country) => [country.code, country.riskPoints]),
    );
    const industryRiskPointsByKey = new Map(
      industries.map((industry) => [industry.key, industry.riskPoints]),
    );
    const documentationRiskPoints = getRequiredRiskSetting(
      settings,
      RiskSettingKey.DOCUMENTATION_RISK_POINTS,
    );
    const manualReviewThreshold = getRequiredRiskSetting(
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
}
