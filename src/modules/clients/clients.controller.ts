import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('MANAGER', 'AGENT')
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @Roles('MANAGER', 'AGENT', 'ASSISTANT')
  findAll() {
    return this.clientsService.findAll();
  }

  @Get('by-phone/:phone')
  @Roles('MANAGER', 'AGENT', 'SYSTEM')
  findByPhone(@Param('phone') phone: string) {
    return this.clientsService.findByPhone(phone);
  }

  @Get(':id')
  @Roles('MANAGER', 'AGENT', 'ASSISTANT')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles('MANAGER', 'AGENT')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('MANAGER')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
