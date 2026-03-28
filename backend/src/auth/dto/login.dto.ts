import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { trimLowercaseString } from '../../common/utils/string-transform.util';

export class LoginDto {
  @ApiProperty({ example: 'admin@complif.com' })
  @Transform(({ value }) => trimLowercaseString(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
