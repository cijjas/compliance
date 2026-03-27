import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusinessStatus } from '../../common/enums';
import { trimString } from '../../common/utils/string-transform.util';

export class UpdateStatusDto {
  @IsEnum(BusinessStatus)
  status!: BusinessStatus;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  reason?: string;
}
