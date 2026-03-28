import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '../../common/enums';
import { trimString } from '../../common/utils/string-transform.util';

export class UpdateStatusDto {
  @ApiProperty({ enum: BusinessStatus, example: BusinessStatus.APPROVED })
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @ApiPropertyOptional({ example: 'All documentation verified' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  reason?: string;
}
