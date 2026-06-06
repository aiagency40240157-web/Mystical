import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'manager@mystical.com', password: 'Manager123!', role: 'MANAGER' },
    { email: 'agent@mystical.com', password: 'Agent123!!', role: 'AGENT' },
    { email: 'assistant@mystical.com', password: 'Assistant1', role: 'ASSISTANT' },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role },
      create: { email: u.email, passwordHash, role: u.role },
    });
    console.log(`✓ ${u.role}: ${u.email} / ${u.password}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
