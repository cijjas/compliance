import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimString } from '../../common/utils/string-transform.util';

export class DeleteBusinessDto {
  @ApiProperty({
    example:
      'Duplicate case created during onboarding. Record archived to preserve the audit trail.',
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
