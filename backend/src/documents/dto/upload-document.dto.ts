import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../common/enums';

export class UploadDocumentDto {
  @ApiProperty({ enum: DocumentType, example: DocumentType.FISCAL_CERTIFICATE })
  @IsEnum(DocumentType)
  type!: DocumentType;
}
