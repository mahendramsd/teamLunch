import { IsArray, IsEmail, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class InviteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true })
  emails: string[];
}
