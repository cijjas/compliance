import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Max, Min } from 'class-validator';
import { BusinessStatus } from '../../common/enums';
import {
  trimString,
  trimUppercaseString,
} from '../../common/utils/string-transform.util';

export class ListBusinessesDto {
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @Transform(({ value }) => trimUppercaseString(value))
  @IsOptional()
  @IsString()
  country?: string;

  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
