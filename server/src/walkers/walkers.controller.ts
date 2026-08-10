import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/zod-pipe';
import { PublicWalkerDto, WalkerPageDto } from './walkers.dto';
import { WalkerQuery, walkerQuerySchema } from './walkers.schemas';
import { WalkersService } from './walkers.service';

@ApiTags('walkers')
@Controller('walkers')
export class WalkersController {
  constructor(private readonly walkers: WalkersService) {}

  @Get()
  @ApiOperation({ summary: 'Search walkers, newest-rated first' })
  @ApiOkResponse({ type: WalkerPageDto })
  async search(
    @Query(new ZodValidationPipe(walkerQuerySchema)) query: WalkerQuery,
  ): Promise<WalkerPageDto> {
    return this.walkers.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One walker' })
  @ApiOkResponse({ type: PublicWalkerDto })
  async byId(@Param('id') id: string): Promise<PublicWalkerDto> {
    return this.walkers.byId(id);
  }
}
