import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../common/entities';
import { DocumentType } from '../common/enums';
import {
  HIGH_RISK_COUNTRIES,
  HIGH_RISK_INDUSTRIES,
  REQUIRED_DOCUMENT_TYPES,
} from './business-risk.constants';

interface CalculateRiskAssessmentInput {
  country: string;
  industry: string;
  identifierValidated: boolean;
  documentTypes: DocumentType[];
}

export interface BusinessRiskAssessment {
  score: number;
  requiresManualReview: boolean;
  breakdown: {
    countryRisk: number;
    industryRisk: number;
    documentationRisk: number;
    identifierRisk: number;
    missingDocumentTypes: DocumentType[];
  };
}

@Injectable()
export class BusinessRiskService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async refreshBusinessRiskScore(
    businessId: string,
  ): Promise<BusinessRiskAssessment> {
    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      relations: ['documents'],
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const assessment = this.calculateAssessment({
      country: business.country,
      industry: business.industry,
      identifierValidated: business.identifierValidated,
      documentTypes: business.documents.map((document) => document.type),
    });

    business.riskScore = assessment.score;
    await this.businessRepo.save(business);

    return assessment;
  }

  calculateAssessment(
    input: CalculateRiskAssessmentInput,
  ): BusinessRiskAssessment {
    const normalizedCountry = input.country.toUpperCase();
    const normalizedIndustry = input.industry.trim().toLowerCase();
    const missingDocumentTypes = REQUIRED_DOCUMENT_TYPES.filter(
      (documentType) => !input.documentTypes.includes(documentType),
    );

    const breakdown = {
      countryRisk: HIGH_RISK_COUNTRIES.has(normalizedCountry) ? 30 : 0,
      industryRisk: HIGH_RISK_INDUSTRIES.has(normalizedIndustry) ? 25 : 0,
      documentationRisk: missingDocumentTypes.length * 20,
      identifierRisk: input.identifierValidated ? 0 : 5,
      missingDocumentTypes,
    };

    const score = Math.min(
      breakdown.countryRisk +
        breakdown.industryRisk +
        breakdown.documentationRisk +
        breakdown.identifierRisk,
      100,
    );

    return {
      score,
      requiresManualReview: score > 70,
      breakdown,
    };
  }
}
