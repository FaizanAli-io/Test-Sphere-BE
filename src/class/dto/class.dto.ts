import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsOptional } from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    example: 'Mathematics 101',
    description: 'The name of the class',
  })
  @IsString()
  @Length(1, 255)
  name: string;
}

export class JoinClassDto {
  @ApiProperty({
    example: 'ABC123',
    description: 'The unique code to join the class',
  })
  @IsString()
  @Length(6, 10)
  classCode: string;
}

export class UpdateClassDto {
  @ApiProperty({
    example: 'Advanced Mathematics',
    description: 'The new name of the class',
  })
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;
}
