import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';

const monthsAgo = (months: number): Date =>
  new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

@Injectable()
export class RetentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Cron('0 0 3 * * *')
  async enforceRetention(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    // Waitlist entries older than 6 months
    const { count: deletedWaitlist } = await this.prisma.waitlistEntry.deleteMany({
      where: { createdAt: { lt: monthsAgo(6) } },
    });

    // Audit logs older than 24 months (secure deletion after retention period)
    const { count: deletedAudit } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: monthsAgo(24) } },
    });

    // Terminal appointments older than 12 months with no associated payment
    const staleIds = await this.prisma.appointment
      .findMany({
        where: {
          createdAt: { lt: monthsAgo(12) },
          status: { in: ['CANCELLED', 'NO_SHOW'] },
          payment: null,
        },
        select: { id: true },
      })
      .then((rows: { id: string }[]) => rows.map((r) => r.id));

    if (staleIds.length > 0) {
      await this.prisma.appointment.deleteMany({ where: { id: { in: staleIds } } });
    }

    // Non-terminal payments older than 12 months (not subject to 7-year legal retention)
    await this.prisma.payment.deleteMany({
      where: {
        createdAt: { lt: monthsAgo(12) },
        status: { notIn: ['SUCCESS', 'REFUNDED', 'PENALTY_APPLIED'] },
      },
    });

    this.auditService.log('RETENTION_ENFORCED', {
      deletedWaitlistEntries: deletedWaitlist,
      deletedAuditLogs: deletedAudit,
      deletedStaleAppointments: staleIds.length,
    });
  }
}
