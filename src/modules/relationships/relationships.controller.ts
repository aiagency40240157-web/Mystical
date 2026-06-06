import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { RelationshipsService } from './relationships.service';

@Controller('relationships')
@Roles('MANAGER')
export class RelationshipsController {
  constructor(private readonly relationshipsService: RelationshipsService) {}

  @Get()
  findAll() {
    return this.relationshipsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateRelationshipDto) {
    return this.relationshipsService.create(dto);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @Headers('x-manager-id') managerId: string) {
    return this.relationshipsService.confirm(id, managerId ?? 'manager');
  }
}
