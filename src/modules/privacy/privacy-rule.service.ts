import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { pacificMinutesSinceMidnight, pacificDateString, pacificDayBounds } from '../../common/utils/timezone.util';

const BREAK_START_MIN = 13 * 60 + 30; // 13:30 PT
const BREAK_END_MIN = 14 * 60 + 15;   // 14:15 PT
const RELATION_GAP_MS = 4 * 60 * 60 * 1000; // 4 hours

@Injectable()
export class PrivacyRuleService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
  ) {}

  async evaluate(params: {
    clientId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    const allowed = await this.runRules(params);
    if (process.env.ENABLE_AUDIT !== 'false') {
      this.auditService.log('PRIVACY_EVALUATED', { clientId: params.clientId, allowed });
    }
    return allowed;
  }

  // Silent check — same rules but no audit log, used for filtering alternative slots
  async check(params: {
    clientId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    return this.runRules(params);
  }

  private async runRules(params: {
    clientId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    if (this.overlapsBreak(params.startTime, params.endTime)) return false;

    const relationshipConflict = await this.hasRelationshipConflict(
      params.clientId,
      params.startTime,
      params.endTime,
    );
    if (relationshipConflict) return false;

    const client = await this.prisma.client.findUnique({
      where: { id: params.clientId },
    });
    if (!client) return false;

    const normalizedColor = client.groupColor?.toUpperCase() ?? null;
    if (normalizedColor === 'RED' || normalizedColor === 'YELLOW') {
      const colorConflict = await this.hasGroupColorConflict(
        normalizedColor,
        params.startTime,
      );
      if (colorConflict) return false;
    }

    return true;
  }

  private overlapsBreak(start: Date, end: Date): boolean {
    const startMin = pacificMinutesSinceMidnight(start);
    const endMin = pacificMinutesSinceMidnight(end);
    return startMin < BREAK_END_MIN && endMin > BREAK_START_MIN;
  }

  private async hasRelationshipConflict(
    clientId: string,
    start: Date,
    end: Date,
  ): Promise<boolean> {
    const relationships = await this.prisma.relationship.findMany({
      where: {
        confirmed: true,
        OR: [{ clientAId: clientId }, { clientBId: clientId }],
      },
    });

    if (relationships.length === 0) return false;

    const relatedIds = relationships.map(r =>
      r.clientAId === clientId ? r.clientBId : r.clientAId,
    );

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        clientId: { in: relatedIds },
        startTime: { lt: new Date(end.getTime() + RELATION_GAP_MS) },
        endTime: { gt: new Date(start.getTime() - RELATION_GAP_MS) },
      },
    });

    return !!conflict;
  }

  private async hasGroupColorConflict(
    color: string,
    startTime: Date,
  ): Promise<boolean> {
    const oppositeColor = color === 'RED' ? 'YELLOW' : 'RED';
    const { start: dayStart, end: dayEnd } = pacificDayBounds(pacificDateString(startTime));

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        status: { not: 'CANCELLED' },
        client: { groupColor: { equals: oppositeColor, mode: 'insensitive' } },
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });
    return !!conflict;
  }
}
