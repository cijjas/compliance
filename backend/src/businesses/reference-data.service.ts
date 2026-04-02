import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
  RiskSettingKey,
} from '../common/entities';
import { getRequiredRiskSetting } from '../common/utils/risk-settings.util';
import { DocumentType } from '../common/enums';
import { REQUIRED_DOCUMENT_TYPES } from '../risk-scoring';

export interface BusinessReferenceData {
  countries: Array<{
    code: string;
    name: string;
    riskPoints: number;
  }>;
  industries: Array<{
    key: string;
    label: string;
    riskPoints: number;
  }>;
  riskSettings: {
    documentationRiskPoints: number;
    manualReviewThreshold: number;
  };
  requiredDocumentTypes: DocumentType[];
}

@Injectable()
export class BusinessReferenceDataService {
  constructor(
    @InjectRepository(CountryPolicy)
    private readonly countryPolicyRepo: Repository<CountryPolicy>,
    @InjectRepository(IndustryPolicy)
    private readonly industryPolicyRepo: Repository<IndustryPolicy>,
    @InjectRepository(RiskSetting)
    private readonly riskSettingRepo: Repository<RiskSetting>,
  ) {}

  async getReferenceData(): Promise<BusinessReferenceData> {
    const [countries, industries, settings] = await this.loadPolicyData();

    return {
      countries: countries.map((country) => ({
        code: country.code,
        name: country.name,
        riskPoints: country.riskPoints,
      })),
      industries: industries.map((industry) => ({
        key: industry.key,
        label: industry.label,
        riskPoints: industry.riskPoints,
      })),
      riskSettings: {
        documentationRiskPoints: getRequiredRiskSetting(
          settings,
          RiskSettingKey.DOCUMENTATION_RISK_POINTS,
        ),
        manualReviewThreshold: getRequiredRiskSetting(
          settings,
          RiskSettingKey.MANUAL_REVIEW_THRESHOLD,
        ),
      },
      requiredDocumentTypes: [...REQUIRED_DOCUMENT_TYPES],
    };
  }

  async assertActiveCountry(countryCode: string): Promise<CountryPolicy> {
    const country = await this.countryPolicyRepo.findOne({
      where: { code: countryCode.toUpperCase(), isActive: true },
    });

    if (!country) {
      throw new BadRequestException(
        `Unsupported country "${countryCode}". Compliance policy is not configured for that jurisdiction.`,
      );
    }

    return country;
  }

  async assertActiveIndustry(industryKey: string): Promise<IndustryPolicy> {
    const industry = await this.industryPolicyRepo.findOne({
      where: { key: industryKey.trim().toLowerCase(), isActive: true },
    });

    if (!industry) {
      throw new BadRequestException(
        `Unsupported industry "${industryKey}". Compliance policy is not configured for that sector.`,
      );
    }

    return industry;
  }

  async assertSupportedBusinessProfile(
    countryCode: string,
    industryKey: string,
  ) {
    const [country, industry] = await Promise.all([
      this.assertActiveCountry(countryCode),
      this.assertActiveIndustry(industryKey),
    ]);

    return { country, industry };
  }

  private async loadPolicyData() {
    return Promise.all([
      this.countryPolicyRepo.find({
        where: { isActive: true },
        order: { name: 'ASC' },
      }),
      this.industryPolicyRepo.find({
        where: { isActive: true },
        order: { label: 'ASC' },
      }),
      this.riskSettingRepo.find(),
    ]);
  }

}
