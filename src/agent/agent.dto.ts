import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class AgentDto {
  @ApiProperty({
    example: 'Explain unit testing in Node.js',
    description: 'The prompt to send to the agent',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
