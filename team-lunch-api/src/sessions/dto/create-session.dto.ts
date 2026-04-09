import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title: string;
}
