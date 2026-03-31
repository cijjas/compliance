import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BusinessStatus } from '../../common/enums';
import { trimString } from '../../common/utils/string-transform.util';

export class UpdateStatusDto {
  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.APPROVED })
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @ApiProperty({
    example:
      'Case reviewed by compliance analyst after verifying supporting evidence.',
  })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  reason!: string;
}
