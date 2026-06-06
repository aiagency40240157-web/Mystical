import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuditService {
  private writeLock = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  log(action: string, metadata: Record<string, unknown>): void {
    this.writeLock = this.writeLock
      .then(() => this.writeEntry(action, metadata))
      .catch(() => {
        process.stderr.write(
          JSON.stringify({
            level: 'error',
            timestamp: new Date().toISOString(),
            msg: 'Audit write failed',
            action,
          }) + '\n',
        );
      });
  }

  private async writeEntry(action: string, metadata: Record<string, unknown>): Promise<void> {
    await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const latest = await tx.auditLog.findFirst({ orderBy: { createdAt: 'desc' } });
        const previousHash = latest?.hash ?? null;
        const timestamp = new Date().toISOString();
        const payload = `${previousHash ?? ''}|${action}|${JSON.stringify(metadata)}|${timestamp}`;
        const hash = createHash('sha256').update(payload).digest('hex');
        await tx.auditLog.create({
          data: { action, metadata: metadata as Prisma.InputJsonValue, hash, previousHash },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
