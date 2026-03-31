import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document, Business } from '../common/entities';
import { RiskScoringModule } from '../risk-scoring';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Business]), RiskScoringModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
