import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import {
  Business,
  CountryPolicy,
  IndustryPolicy,
  RiskSetting,
  StatusHistory,
} from '../common/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessIdentifierValidationService } from './validation/business-identifier-validation.service';
import { BusinessRiskService } from './risk/business-risk.service';
import { BusinessStatusNotifierService } from './notifier/business-status-notifier.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { BusinessReferenceDataService } from './reference-data.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Business,
      StatusHistory,
      CountryPolicy,
      IndustryPolicy,
      RiskSetting,
    ]),
    NotificationsModule,
    HttpModule,
  ],
  controllers: [BusinessesController],
  providers: [
    BusinessesService,
    BusinessReferenceDataService,
    BusinessRiskService,
    BusinessIdentifierValidationService,
    BusinessStatusNotifierService,
  ],
  exports: [
    BusinessesService,
    BusinessRiskService,
    BusinessReferenceDataService,
  ],
})
export class BusinessesModule {}
