import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const TOTAL_SLOTS_PER_DAY = 18; // 9:00-19:00 minus 13:30-14:15 break = 18 × 30-min slots

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(date: string): Promise<{
    appointmentsToday: number;
    noShowsToday: number;
    occupancyRate: number;
    waitlistCount: number;
    weeklyTotal: number;
    weeklyNoShows: number;
  }> {
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const weekStart = new Date(dayStart);
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);

    const [appointmentsToday, noShowsToday, waitlistCount, weeklyTotal, weeklyNoShows] =
      await Promise.all([
        this.prisma.appointment.count({
          where: { startTime: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
        }),
        this.prisma.appointment.count({
          where: { startTime: { gte: dayStart, lte: dayEnd }, status: 'NO_SHOW' },
        }),
        this.prisma.waitlistEntry.count(),
        this.prisma.appointment.count({
          where: { startTime: { gte: weekStart, lte: weekEnd }, status: { not: 'CANCELLED' } },
        }),
        this.prisma.appointment.count({
          where: { startTime: { gte: weekStart, lte: weekEnd }, status: 'NO_SHOW' },
        }),
      ]);

    return {
      appointmentsToday,
      noShowsToday,
      occupancyRate: Math.round((appointmentsToday / TOTAL_SLOTS_PER_DAY) * 100),
      waitlistCount,
      weeklyTotal,
      weeklyNoShows,
    };
  }

  async getWaitlistPressure(): Promise<{ count: number; highPriority: number }> {
    const [count, highPriority] = await Promise.all([
      this.prisma.waitlistEntry.count(),
      this.prisma.waitlistEntry.count({ where: { priority: 'HIGH' } }),
    ]);
    return { count, highPriority };
  }
}
