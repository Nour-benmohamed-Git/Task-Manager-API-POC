import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ example: 'Learn NestJS', description: 'Title of the task' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Build a full POC with Postgres', description: 'Task details' })
  @IsString()
  @IsNotEmpty()
  description: string;
}