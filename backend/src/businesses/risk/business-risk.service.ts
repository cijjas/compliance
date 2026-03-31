import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../common/entities';
import {
  BusinessRiskAssessment,
  CalculateBusinessRiskInput,
  calculateBusinessRiskAssessment,
} from './business-risk.policy';
import { BusinessReferenceDataService } from '../reference-data.service';

@Injectable()
export class BusinessRiskService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    private readonly businessReferenceDataService: BusinessReferenceDataService,
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

    const assessment = await this.calculateAssessment({
      country: business.country,
      industry: business.industry,
      documentTypes: business.documents.map((document) => document.type),
    });

    business.riskScore = assessment.score;
    await this.businessRepo.save(business);

    return assessment;
  }

  async calculateAssessment(
    input: CalculateBusinessRiskInput,
  ): Promise<BusinessRiskAssessment> {
    const policy =
      await this.businessReferenceDataService.getRiskPolicySnapshot();

    return calculateBusinessRiskAssessment(input, policy);
  }
}
