import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Business,
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
} from '../common/entities';
import { RiskAssessmentService } from './risk-assessment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      CountryPolicy,
      IndustryPolicy,
      RiskSetting,
    ]),
  ],
  providers: [RiskAssessmentService],
  exports: [RiskAssessmentService],
})
export class RiskScoringModule {}
