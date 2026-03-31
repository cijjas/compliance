import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '../../common/enums';
import {
  trimLowercaseString,
  trimUppercaseString,
} from '../../common/utils/string-transform.util';

export class PreviewRiskDto {
  @ApiProperty({
    example: 'AR',
    description: 'ISO 3166-1 alpha-2 country code',
  })
  @Transform(({ value }) => trimUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiProperty({ example: 'technology' })
  @Transform(({ value }) => trimLowercaseString(value))
  @IsString()
  industry!: string;

  @ApiProperty({
    enum: DocumentType,
    isArray: true,
    example: [DocumentType.FISCAL_CERTIFICATE, DocumentType.REGISTRATION_PROOF],
  })
  @IsArray()
  @ArrayUnique()
  @IsEnum(DocumentType, { each: true })
  documentTypes!: DocumentType[];
}
