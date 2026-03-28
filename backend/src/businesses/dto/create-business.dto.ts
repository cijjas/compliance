import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  trimString,
  trimUppercaseString,
} from '../../common/utils/string-transform.util';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Acme Corp SA' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '20-12345678-9', description: 'CUIT, RFC, CNPJ or fiscal identifier' })
  @Transform(({ value }) => trimUppercaseString(value))
  @IsString()
  @IsNotEmpty()
  taxIdentifier!: string;

  @ApiProperty({ example: 'AR', description: 'ISO 3166-1 alpha-2 country code' })
  @Transform(({ value }) => trimUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country!: string;

  @ApiProperty({ example: 'technology' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  industry!: string;
}
