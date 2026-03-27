import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { trimLowercaseString } from '../../common/utils/string-transform.util';

export class LoginDto {
  @Transform(({ value }) => trimLowercaseString(value))
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
