import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response shapes for /me.
 *
 * These exist so the OpenAPI document carries real schemas: the app generates
 * its types from it, and an endpoint documented only by its TypeScript return
 * type produces an empty schema and therefore a useless generated type. Every
 * nullable field needs an explicit `type:` too, or it generates as
 * `Record<string, never>`.
 */

export class DogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ბობი' })
  name!: string;

  @ApiProperty({ example: 'ლაბრადორი' })
  breed!: string;

  @ApiProperty({
    example: '2023-03-14',
    description: 'Date only. The app renders "3 წლის" from this.',
  })
  birthDate!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  photoUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  notes!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  sizeKg!: number | null;
}

export class AddressDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'სახლი' })
  label!: string;

  @ApiProperty({ example: 'ვაკე' })
  district!: string;

  @ApiProperty({ example: 'აბაშიძის 12' })
  street!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Decrypted, and only ever returned to the address owner.',
  })
  entranceCode!: string | null;
}

export class WalkerProfileDto {
  @ApiProperty()
  bio!: string;

  @ApiProperty({ example: 1500, description: 'Per 30 minutes, in tetri.' })
  price30Tetri!: number;

  @ApiProperty({ type: [String] })
  districts!: string[];

  @ApiProperty()
  isAvailableNow!: boolean;

  @ApiProperty()
  verified!: boolean;

  @ApiProperty({ example: 4.9 })
  rating!: number;

  @ApiProperty({ example: 127 })
  reviewCount!: number;
}

export class OkDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}
