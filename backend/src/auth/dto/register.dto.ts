import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  trimLowercaseString,
  trimString,
} from '../../common/utils/string-transform.util';

export class RegisterDto {
  @ApiProperty({ example: 'user@complif.com' })
  @Transform(({ value }) => trimLowercaseString(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'John' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(({ value }) => trimString(value))
  @IsString()
  lastName!: string;
}
