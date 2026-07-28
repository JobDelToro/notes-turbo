import { IsString, MaxLength } from 'class-validator';

/** Request body for the AI helpers. `@IsString` turns a non-string body into a
 * clean 400 instead of a 500 deep in the service. */
export class AiContentDto {
  @IsString()
  @MaxLength(10_000)
  content!: string;
}
