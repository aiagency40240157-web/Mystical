import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
}
