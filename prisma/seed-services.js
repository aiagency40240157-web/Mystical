const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const services = [
    {
      name: 'Existing Client Session',
      category: 'Consulting & Coaching Services',
      durationMins: 25,
      price: 5500,
    },
    {
      name: 'New Client Consulting',
      category: 'Consulting & Coaching Services',
      durationMins: 30,
      price: 7500,
    },
    {
      name: 'Aura Photography',
      category: 'Holistic Services',
      durationMins: 30,
      price: 5000,
    },
    {
      name: 'Life Coaching — 30 min',
      category: 'Life Coaching',
      durationMins: 30,
      price: 8800,
    },
    {
      name: 'Life Coaching — 60 min',
      category: 'Life Coaching',
      durationMins: 60,
      price: 16600,
    },
    {
      name: 'Monthly Package',
      category: 'Life Coaching',
      durationMins: 0,
      price: 0,
    },
    {
      name: 'Chakra Alignment',
      category: 'Therapeutic Services',
      durationMins: 60,
      price: 17500,
    },
    {
      name: 'Sound Vibrational Therapy',
      category: 'Therapeutic Services',
      durationMins: 60,
      price: 22500,
    },
    {
      name: 'Treasure Bliss: EF, SVT, CB, CC, AC',
      category: 'Therapeutic Services',
      durationMins: 60,
      price: 47500,
    },
    {
      name: 'Private Sound Bath',
      category: 'Therapeutic Services',
      durationMins: 60,
      price: 35000,
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: s });
      console.log(`✅  Created: ${s.name}`);
    } else {
      console.log(`⏭️  Already exists: ${s.name}`);
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
