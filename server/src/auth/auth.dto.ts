import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** The signed-in user, as the app sees them. Never another user's row. */
export class MeDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'levan@modimodi.ge' })
  email!: string;

  @ApiProperty({ example: 'ლევან ხ.' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarKey!: string | null;

  @ApiProperty()
  isOwner!: boolean;

  @ApiProperty()
  isWalker!: boolean;

  @ApiProperty({ description: 'True once a walker profile exists.' })
  hasWalkerProfile!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
