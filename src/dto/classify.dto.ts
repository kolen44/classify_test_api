import { IsString, MinLength } from 'class-validator';

export class ClassifyDto {
  @IsString({ message: '"text" must be a string' })
  @MinLength(1, { message: '"text" cannot be empty' })
  text: string;
}
