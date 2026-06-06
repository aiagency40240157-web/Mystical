import { Injectable, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PrivacyRuleService } from '../privacy/privacy-rule.service';
import { AuditService } from '../audit/audit.service';

const DURATION_MS = 30 * 60_000;

@Injectable()
export class WaitlistService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly privacyRuleService: PrivacyRuleService,
    @Optional() private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'asc' },
      include: { client: { select: { firstName: true, lastName: true } } },
    });
  }

  async add(clientId: string, requestedTime: Date): Promise<void> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    const priority = client?.isVip ? 'HIGH' : 'LOW';
    await this.prisma.waitlistEntry.create({
      data: { clientId, requestedTime, priority },
    });
    if (process.env.ENABLE_AUDIT !== 'false') {
      this.auditService.log('WAITLIST_ADDED', { clientId, requestedTime: requestedTime.toISOString(), priority });
    }
  }

  async promoteForSlot(startTime: Date): Promise<void> {
    const endTime = new Date(startTime.getTime() + DURATION_MS);

    const highPriority = await this.prisma.waitlistEntry.findMany({
      where: { requestedTime: startTime, priority: 'HIGH' },
      orderBy: { createdAt: 'asc' },
    });
    const lowPriority = await this.prisma.waitlistEntry.findMany({
      where: { requestedTime: startTime, priority: 'LOW' },
      orderBy: { createdAt: 'asc' },
    });
    const candidates = [...highPriority, ...lowPriority];

    for (const entry of candidates) {
      const allowed = await this.privacyRuleService.evaluate({
        clientId: entry.clientId,
        startTime,
        endTime,
      });

      if (!allowed) continue;

      let promoted = false;
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const conflict = await tx.appointment.findFirst({
          where: {
            status: { not: 'CANCELLED' },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict) return;

        await tx.appointment.create({
          data: { clientId: entry.clientId, startTime, endTime, status: 'PENDING_PAYMENT' },
        });
        await tx.waitlistEntry.delete({ where: { id: entry.id } });
        promoted = true;
      });

      if (promoted) {
        if (process.env.ENABLE_AUDIT !== 'false') {
          this.auditService.log('WAITLIST_PROMOTED', { clientId: entry.clientId, startTime: startTime.toISOString() });
        }
        break;
      }
    }
  }
}
