import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

  async remove(id: string) {
    await this.findOne(id);
    const appointments = await this.prisma.appointment.count({ where: { clientId: id } });
    if (appointments > 0) {
      throw new BadRequestException(
        'No se puede borrar: el cliente tiene citas. Cancela sus citas primero.',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.relationship.deleteMany({
        where: { OR: [{ clientAId: id }, { clientBId: id }] },
      });
      await tx.waitlistEntry.deleteMany({ where: { clientId: id } });
      await tx.clientCredit.deleteMany({ where: { clientId: id } });
      await tx.income.updateMany({ where: { clientId: id }, data: { clientId: null } });
      return tx.client.delete({ where: { id } });
    });
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
