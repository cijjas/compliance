import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../common/enums';
import {
  trimLowercaseString,
  trimString,
} from '../../common/utils/string-transform.util';

export class RegisterDto {
  @Transform(({ value }) => trimLowercaseString(value))
  @IsEmail()
  email!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(6)
  password!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  firstName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  lastName!: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
