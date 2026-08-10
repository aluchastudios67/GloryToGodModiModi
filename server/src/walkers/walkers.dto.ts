import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * What anyone may see about a walker.
 *
 * Built field by field, never by spreading a Prisma model. Spreading is how
 * `email`, `phone` and `passwordHash` reach a response, and it only has to
 * happen once. A test deep-scans the serialised JSON for those keys.
 */
export class PublicWalkerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ნინო ბ.' })
  name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'CDN URL, resolved from the stored object key.',
  })
  avatarUrl!: string | null;

  @ApiProperty({ example: 4.9, description: 'Denormalised average, 0–5.' })
  rating!: number;

  @ApiProperty({ example: 127 })
  reviewCount!: number;

  @ApiProperty({ example: 1500, description: 'Price for 30 minutes, in tetri.' })
  price30Tetri!: number;

  @ApiProperty({ description: 'True once an admin has verified identity.' })
  verified!: boolean;

  @ApiProperty()
  isAvailableNow!: boolean;

  @ApiProperty({ type: [String], example: ['ვაკე'] })
  districts!: string[];

  @ApiProperty({ example: 'სამი წელია ვასეირნებ ძაღლებს ვაკეში.' })
  bio!: string;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Always null until location lands. The field exists so the client ' +
      'contract does not change when it starts being populated.',
  })
  distanceKm!: number | null;
}

export class WalkerPageDto {
  @ApiProperty({ type: [PublicWalkerDto] })
  items!: PublicWalkerDto[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Pass back as ?cursor= for the next page. Null at the end.',
  })
  nextCursor!: string | null;
}
