import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AddressDto,
  DogDto,
  OkDto,
  WalkerProfileDto,
} from './me.dto';
import { AuthedUser, CurrentUser } from '../auth/auth.guard';
import { ZodValidationPipe } from '../common/zod-pipe';
import {
  AvailabilityInput,
  CreateAddressInput,
  CreateDogInput,
  UpdateDogInput,
  WalkerProfileInput,
  availabilitySchema,
  createAddressSchema,
  createDogSchema,
  updateDogSchema,
  walkerProfileSchema,
} from './me.schemas';
import {
  AddressView,
  DogView,
  MeService,
  WalkerProfileView,
} from './me.service';

/**
 * Everything here is implicitly scoped to the caller. No route takes a user id;
 * it comes from the guard.
 */
@ApiTags('me')
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('dogs')
  @ApiOperation({ summary: "The caller's dogs" })
  @ApiOkResponse({ type: [DogDto] })
  async dogs(@CurrentUser() user: AuthedUser): Promise<DogView[]> {
    return this.me.listDogs(user.id);
  }

  @Post('dogs')
  @ApiOperation({ summary: 'Add a dog' })
  @ApiOkResponse({ type: DogDto })
  async addDog(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(createDogSchema)) body: CreateDogInput,
  ): Promise<DogView> {
    return this.me.createDog(user.id, body);
  }

  @Patch('dogs/:id')
  @ApiOperation({ summary: 'Update a dog' })
  @ApiOkResponse({ type: DogDto })
  async editDog(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDogSchema)) body: UpdateDogInput,
  ): Promise<DogView> {
    return this.me.updateDog(user.id, id, body);
  }

  @Delete('dogs/:id')
  @ApiOperation({ summary: 'Soft-delete a dog' })
  @ApiOkResponse({ type: OkDto })
  async removeDog(
    @CurrentUser() user: AuthedUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    return this.me.deleteDog(user.id, id);
  }

  @Get('addresses')
  @ApiOperation({ summary: "The caller's addresses, door codes decrypted" })
  @ApiOkResponse({ type: [AddressDto] })
  async addresses(@CurrentUser() user: AuthedUser): Promise<AddressView[]> {
    return this.me.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add an address' })
  @ApiOkResponse({ type: AddressDto })
  async addAddress(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(createAddressSchema)) body: CreateAddressInput,
  ): Promise<AddressView> {
    return this.me.createAddress(user.id, body);
  }

  @Get('walker-profile')
  @ApiOperation({ summary: 'The walker profile, or null' })
  @ApiOkResponse({ type: WalkerProfileDto })
  async walkerProfile(
    @CurrentUser() user: AuthedUser,
  ): Promise<WalkerProfileView | null> {
    return this.me.getWalkerProfile(user.id);
  }

  @Put('walker-profile')
  @ApiOperation({ summary: 'Create or replace the walker profile' })
  @ApiOkResponse({ type: WalkerProfileDto })
  async putWalkerProfile(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(walkerProfileSchema)) body: WalkerProfileInput,
  ): Promise<WalkerProfileView> {
    return this.me.putWalkerProfile(user.id, body);
  }

  @Patch('walker-profile/availability')
  @ApiOperation({ summary: 'Go available or unavailable' })
  @ApiOkResponse({ type: WalkerProfileDto })
  async setAvailability(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(availabilitySchema)) body: AvailabilityInput,
  ): Promise<WalkerProfileView> {
    return this.me.setAvailability(user.id, body);
  }
}
