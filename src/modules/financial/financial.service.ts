import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { pacificDateString, pacificDayBounds } from '../../common/utils/timezone.util';
import { CreateIncomeDto } from './dto/create-income.dto';
import { CreateCreditDto } from './dto/create-credit.dto';
import { UpdateCreditDto } from './dto/update-credit.dto';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const todayStr = pacificDateString(now);
    const { start: dayStart, end: dayEnd } = pacificDayBounds(todayStr);

    const [y, m, d] = todayStr.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(y, m - 1, d));

    const dayOfWeek = todayUtc.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mondayUtc = new Date(todayUtc);
    mondayUtc.setUTCDate(todayUtc.getUTCDate() - daysToMonday);
    const weekStr = `${mondayUtc.getUTCFullYear()}-${String(mondayUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(mondayUtc.getUTCDate()).padStart(2, '0')}`;

    const monthStr = `${y}-${String(m).padStart(2, '0')}-01`;
    const yearStr = `${y}-01-01`;

    const { start: weekStart } = pacificDayBounds(weekStr);
    const { start: monthStart } = pacificDayBounds(monthStr);
    const { start: yearStart } = pacificDayBounds(yearStr);

    const [todayTotal, weekTotal, monthTotal, yearTotal, credits] = await Promise.all([
      this.sumIncome(dayStart, dayEnd),
      this.sumIncome(weekStart, dayEnd),
      this.sumIncome(monthStart, dayEnd),
      this.sumIncome(yearStart, dayEnd),
      this.prisma.clientCredit.findMany({
        include: { client: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    const outstanding = credits
      .map((c) => ({ ...c, balance: Math.round((c.amount - c.paidAmount) * 100) / 100 }))
      .filter((c) => c.balance > 0.001);

    return {
      income: { today: todayTotal, week: weekTotal, month: monthTotal, year: yearTotal },
      credits: {
        total: Math.round(outstanding.reduce((sum, c) => sum + c.balance, 0) * 100) / 100,
        count: outstanding.length,
        items: outstanding,
      },
    };
  }

  private async sumIncome(from: Date, to: Date): Promise<number> {
    const result = await this.prisma.income.aggregate({
      where: { recordedAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return Math.round((result._sum.amount ?? 0) * 100) / 100;
  }

  async getCredits() {
    const credits = await this.prisma.clientCredit.findMany({
      include: {
        client: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return credits.map((c) => ({
      ...c,
      balance: Math.round((c.amount - c.paidAmount) * 100) / 100,
    }));
  }

  async createIncome(dto: CreateIncomeDto, recordedBy: string) {
    return this.prisma.income.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
        clientId: dto.clientId || null,
        recordedBy,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      },
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async createCredit(dto: CreateCreditDto, createdBy: string) {
    return this.prisma.clientCredit.create({
      data: {
        clientId: dto.clientId,
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
        createdBy,
      },
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async updateCredit(id: string, dto: UpdateCreditDto) {
    const existing = await this.prisma.clientCredit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Credit not found');
    return this.prisma.clientCredit.update({
      where: { id },
      data: {
        ...(dto.paidAmount !== undefined && { paidAmount: dto.paidAmount }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { client: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
