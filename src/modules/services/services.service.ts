import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }

  update(id: string, dto: UpdateServiceDto) {
    return this.prisma.service.update({ where: { id }, data: dto });
  }

  // Soft delete: keep the row so historical appointments keep their reference,
  // but hide it from the active catalog (findAll filters isActive: true).
  remove(id: string) {
    return this.prisma.service.update({ where: { id }, data: { isActive: false } });
  }
}
