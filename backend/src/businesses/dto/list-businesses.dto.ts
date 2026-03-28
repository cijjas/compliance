import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessStatus } from '../../common/enums';
import {
  trimString,
  trimUppercaseString,
} from '../../common/utils/string-transform.util';

export class ListBusinessesDto {
  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @ApiPropertyOptional({ example: 'AR', description: 'ISO 3166-1 alpha-2 country code' })
  @Transform(({ value }) => trimUppercaseString(value))
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Acme', description: 'Search by business name' })
  @Transform(({ value }) => trimString(value))
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
