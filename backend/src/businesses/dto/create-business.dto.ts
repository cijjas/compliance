import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, Length } from 'class-validator';
import {
  trimString,
  trimUppercaseString,
} from '../../common/utils/string-transform.util';

export class CreateBusinessDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Transform(({ value }) => trimUppercaseString(value))
  @IsString()
  @IsNotEmpty()
  taxIdentifier!: string;

  @Transform(({ value }) => trimUppercaseString(value))
  @IsString()
  @Length(2, 2)
  country!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  industry!: string;
}
