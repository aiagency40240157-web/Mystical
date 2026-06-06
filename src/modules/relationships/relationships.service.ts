import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';

@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRelationshipDto) {
    return this.prisma.relationship.upsert({
      where: { clientAId_clientBId: { clientAId: dto.clientAId, clientBId: dto.clientBId } },
      update: { confidence: dto.confidence },
      create: { clientAId: dto.clientAId, clientBId: dto.clientBId, confidence: dto.confidence },
      include: {
        clientA: { select: { id: true, firstName: true, lastName: true } },
        clientB: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.relationship.findMany({
      include: {
        clientA: { select: { id: true, firstName: true, lastName: true } },
        clientB: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirm(id: string, confirmedBy: string) {
    return this.prisma.relationship.update({
      where: { id },
      data: { confirmed: true, confirmedBy },
    });
  }

  async areRelated(clientAId: string, clientBId: string): Promise<boolean> {
    const rel = await this.prisma.relationship.findFirst({
      where: {
        confirmed: true,
        OR: [
          { clientAId, clientBId },
          { clientAId: clientBId, clientBId: clientAId },
        ],
      },
    });
    return !!rel;
  }
}
