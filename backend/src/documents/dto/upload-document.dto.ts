import { IsEnum } from 'class-validator';
import { DocumentType } from '../../common/enums';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type!: DocumentType;
}
