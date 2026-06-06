import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  findAll() {
    return this.prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Invalid request');
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async findByPhone(phone: string) {
    return this.prisma.client.findFirst({ where: { phone } });
  }

  async findOrCreateByPhone(phone: string, firstName: string, lastName: string) {
    const existing = await this.prisma.client.findFirst({ where: { phone } });
    if (existing) return existing;
    return this.prisma.client.create({ data: { phone, firstName, lastName } });
  }
}
