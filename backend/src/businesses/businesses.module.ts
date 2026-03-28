import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Business, StatusHistory } from '../common/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BusinessIdentifierValidationService } from './business-identifier-validation.service';
import { BusinessRiskService } from './business-risk.service';
import { BusinessStatusNotifierService } from './business-status-notifier.service';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, StatusHistory]),
    NotificationsModule,
    HttpModule,
  ],
  controllers: [BusinessesController],
  providers: [
    BusinessesService,
    BusinessRiskService,
    BusinessIdentifierValidationService,
    BusinessStatusNotifierService,
  ],
  exports: [BusinessesService, BusinessRiskService],
})
export class BusinessesModule {}
