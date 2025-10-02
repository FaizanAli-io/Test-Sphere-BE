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

  @ApiProperty({
    example:
      'An advanced mathematics course covering algebra, calculus, and statistics.',
    description: 'Description of the class content and objectives',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
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
    required: false,
  })
  @IsString()
  @Length(1, 255)
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: 'An updated description for the advanced mathematics course.',
    description: 'Updated description of the class content and objectives',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
