import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Color rules:
//   yellow → VIP only. Never mixed with red/blue.
//   red + blue → regular clients. Can appear together.

const CLIENTS = [
  // ── VIP → yellow (10) ────────────────────────────────────────────────────────
  {
    key: 'isabella',
    firstName: 'Isabella', lastName: 'Torres',
    phone: '3001100001', email: 'isabella.torres@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: true, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'alejandro',
    firstName: 'Alejandro', lastName: 'Torres',
    phone: '3001100002', email: 'alejandro.torres@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: true, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'maria',
    firstName: 'María', lastName: 'Rodríguez',
    phone: '3002200001', email: 'maria.rodriguez@hotmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'sofia',
    firstName: 'Sofía', lastName: 'García',
    phone: '3003300001', email: 'sofia.garcia@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'carmen',
    firstName: 'Carmen', lastName: 'Vega',
    phone: '3004400001', email: 'carmen.vega@yahoo.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'jennifer',
    firstName: 'Jennifer', lastName: 'Williams',
    phone: '3005500001', email: 'jennifer.williams@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'en', noShowCount: 0,
  },
  {
    key: 'robert',
    firstName: 'Robert', lastName: 'Chen',
    phone: '3006600001', email: 'robert.chen@outlook.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'en', noShowCount: 0,
  },
  {
    key: 'patricia_m',
    firstName: 'Patricia', lastName: 'Morales',
    phone: '3007700001', email: 'patricia.morales@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'elena',
    firstName: 'Elena', lastName: 'Castillo',
    phone: '3008800001', email: 'elena.castillo@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'diana_p',
    firstName: 'Diana', lastName: 'Prince',
    phone: '3009900001', email: 'diana.prince@gmail.com',
    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,
    preferredLanguage: 'en', noShowCount: 0,
  },

  // ── Familia Rodríguez → rojo (conocidos de María, pero ella es VIP/amarilla) ─
  {
    key: 'carlos',
    firstName: 'Carlos', lastName: 'Rodríguez',
    phone: '3002200002', email: 'carlos.rodriguez@hotmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 1,
  },
  {
    key: 'ana',
    firstName: 'Ana', lastName: 'Rodríguez',
    phone: '3002200003', email: 'ana.rodriguez@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Familia García → azul ────────────────────────────────────────────────────
  {
    key: 'miguel',
    firstName: 'Miguel', lastName: 'García',
    phone: '3003300002', email: 'miguel.garcia@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'valentina',
    firstName: 'Valentina', lastName: 'García',
    phone: '3003300003', email: 'valentina.garcia@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Amigos Torres (no VIP) → rojo ────────────────────────────────────────────
  {
    key: 'marco',
    firstName: 'Marco', lastName: 'Ruiz',
    phone: '3011100001', email: 'marco.ruiz@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'catalina',
    firstName: 'Catalina', lastName: 'Ruiz',
    phone: '3011100002', email: 'catalina.ruiz@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Grupo trabajo → azul ─────────────────────────────────────────────────────
  {
    key: 'laura',
    firstName: 'Laura', lastName: 'Martínez',
    phone: '3012200001', email: 'laura.martinez@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'patricia_l',
    firstName: 'Patricia', lastName: 'López',
    phone: '3012200002', email: 'patricia.lopez@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 1,
  },
  {
    key: 'diana_h',
    firstName: 'Diana', lastName: 'Hernández',
    phone: '3012200003', email: 'diana.hernandez@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Hermanas Vargas → rojo ────────────────────────────────────────────────────
  {
    key: 'rosa',
    firstName: 'Rosa', lastName: 'Vargas',
    phone: '3013300001', email: 'rosa.vargas@yahoo.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'lucia',
    firstName: 'Lucía', lastName: 'Vargas',
    phone: '3013300002', email: 'lucia.vargas@yahoo.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 2,
  },
  {
    key: 'ernesto',
    firstName: 'Ernesto', lastName: 'Vargas',
    phone: '3013300003', email: 'ernesto.vargas@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Grupo yoga → azul ────────────────────────────────────────────────────────
  {
    key: 'gabriela',
    firstName: 'Gabriela', lastName: 'Reyes',
    phone: '3014400001', email: 'gabriela.reyes@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'andrea',
    firstName: 'Andrea', lastName: 'Jiménez',
    phone: '3014400002', email: 'andrea.jimenez@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'daniela',
    firstName: 'Daniela', lastName: 'Fuentes',
    phone: '3014400003', email: 'daniela.fuentes@gmail.com',
    groupColor: 'BLUE', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 1,
  },

  // ── Hermanos Mora → rojo ──────────────────────────────────────────────────────
  {
    key: 'sebastian',
    firstName: 'Sebastián', lastName: 'Mora',
    phone: '3015500001', email: 'sebastian.mora@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },
  {
    key: 'nicolas',
    firstName: 'Nicolás', lastName: 'Mora',
    phone: '3015500002', email: 'nicolas.mora@gmail.com',
    groupColor: 'RED', isKnownRelation: true, isVip: false,
    preferredLanguage: 'es', noShowCount: 0,
  },

  // ── Clientes regulares → alternando rojo / azul ───────────────────────────────
  { key: 'camila',    firstName: 'Camila',    lastName: 'Peña',       phone: '3020000001', email: 'camila.pena@gmail.com',       groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'juan',      firstName: 'Juan',      lastName: 'Herrera',    phone: '3020000002', email: 'juan.herrera@gmail.com',      groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 1 },
  { key: 'mariana',   firstName: 'Mariana',   lastName: 'Salazar',    phone: '3020000003', email: 'mariana.salazar@gmail.com',   groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'andres',    firstName: 'Andrés',    lastName: 'Gutiérrez',  phone: '3020000004', email: 'andres.gutierrez@gmail.com',  groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'juliana',   firstName: 'Juliana',   lastName: 'Ríos',       phone: '3020000005', email: 'juliana.rios@gmail.com',      groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 3 },
  { key: 'felipe',    firstName: 'Felipe',    lastName: 'Ospina',     phone: '3020000006', email: 'felipe.ospina@gmail.com',     groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'natalia',   firstName: 'Natalia',   lastName: 'Bermúdez',   phone: '3020000007', email: 'natalia.bermudez@gmail.com',  groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'jorge',     firstName: 'Jorge',     lastName: 'Pizarro',    phone: '3020000008', email: 'jorge.pizarro@gmail.com',     groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 2 },
  { key: 'sara',      firstName: 'Sara',      lastName: 'Montoya',    phone: '3020000009', email: 'sara.montoya@gmail.com',      groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'david',     firstName: 'David',     lastName: 'Aguilar',    phone: '3020000010', email: 'david.aguilar@gmail.com',     groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'ashley',    firstName: 'Ashley',    lastName: 'Johnson',    phone: '3020000011', email: 'ashley.johnson@gmail.com',    groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },
  { key: 'michael',   firstName: 'Michael',   lastName: 'Thompson',   phone: '3020000012', email: 'michael.thompson@gmail.com',  groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 1 },
  { key: 'jessica',   firstName: 'Jessica',   lastName: 'Davis',      phone: '3020000013', email: 'jessica.davis@gmail.com',     groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },
  { key: 'lina',      firstName: 'Lina',      lastName: 'Cardona',    phone: '3020000014', email: 'lina.cardona@gmail.com',      groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'steven',    firstName: 'Steven',    lastName: 'Park',       phone: '3020000015', email: 'steven.park@gmail.com',       groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },
  { key: 'valeria',   firstName: 'Valeria',   lastName: 'Sánchez',    phone: '3020000016', email: 'valeria.sanchez@gmail.com',   groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'esteban',   firstName: 'Esteban',   lastName: 'Lozano',     phone: '3020000017', email: 'esteban.lozano@gmail.com',    groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 1 },
  { key: 'paula',     firstName: 'Paula',     lastName: 'Mejía',      phone: '3020000018', email: 'paula.mejia@gmail.com',       groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'samuel',    firstName: 'Samuel',    lastName: 'Cano',       phone: '3020000019', email: 'samuel.cano@gmail.com',       groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'manuela',   firstName: 'Manuela',   lastName: 'Arango',     phone: '3020000020', email: 'manuela.arango@gmail.com',    groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'thomas',    firstName: 'Thomas',    lastName: 'Miller',     phone: '3020000021', email: 'thomas.miller@gmail.com',     groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 2 },
  { key: 'isabela_f', firstName: 'Isabela',   lastName: 'Franco',     phone: '3020000022', email: 'isabela.franco@gmail.com',    groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'kevin',     firstName: 'Kevin',     lastName: 'Smith',      phone: '3020000023', email: 'kevin.smith@gmail.com',       groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },
  { key: 'alejandra', firstName: 'Alejandra', lastName: 'Quintero',   phone: '3020000024', email: 'alejandra.quintero@gmail.com',groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'ricardo',   firstName: 'Ricardo',   lastName: 'Pineda',     phone: '3020000025', email: 'ricardo.pineda@gmail.com',    groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 1 },

  // ── 5 nuevas clientas VIP → yellow ───────────────────────────────────────────
  { key: 'valentina_l', firstName: 'Valentina', lastName: 'López',    phone: '3010000001', email: 'valentina.lopez@gmail.com',    groupColor: 'YELLOW', isKnownRelation: false, isVip: true,  preferredLanguage: 'es', noShowCount: 0 },
  { key: 'adriana',     firstName: 'Adriana',   lastName: 'Reyes',    phone: '3010000002', email: 'adriana.reyes@gmail.com',      groupColor: 'YELLOW', isKnownRelation: false, isVip: true,  preferredLanguage: 'es', noShowCount: 0 },
  { key: 'claudia',     firstName: 'Claudia',   lastName: 'Navarro',  phone: '3010000003', email: 'claudia.navarro@outlook.com',  groupColor: 'YELLOW', isKnownRelation: false, isVip: true,  preferredLanguage: 'es', noShowCount: 0 },
  { key: 'ximena',      firstName: 'Ximena',    lastName: 'Aguilar',  phone: '3010000004', email: 'ximena.aguilar@gmail.com',     groupColor: 'YELLOW', isKnownRelation: false, isVip: true,  preferredLanguage: 'es', noShowCount: 0 },
  { key: 'sarah_m',     firstName: 'Sarah',     lastName: 'Mitchell', phone: '3010000005', email: 'sarah.mitchell@gmail.com',     groupColor: 'YELLOW', isKnownRelation: false, isVip: true,  preferredLanguage: 'en', noShowCount: 0 },

  // ── 5 nuevas clientas → red ───────────────────────────────────────────────────
  { key: 'fernanda',  firstName: 'Fernanda',  lastName: 'Cruz',      phone: '3020000026', email: 'fernanda.cruz@gmail.com',      groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'paola',     firstName: 'Paola',     lastName: 'Medina',    phone: '3020000027', email: 'paola.medina@gmail.com',       groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'veronica',  firstName: 'Verónica',  lastName: 'Soto',      phone: '3020000028', email: 'veronica.soto@yahoo.com',      groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'cristina',  firstName: 'Cristina',  lastName: 'Ramos',     phone: '3020000029', email: 'cristina.ramos@gmail.com',     groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'amanda',    firstName: 'Amanda',    lastName: 'Wilson',    phone: '3020000030', email: 'amanda.wilson@gmail.com',      groupColor: 'RED',  isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },

  // ── 5 nuevas clientas → blue ──────────────────────────────────────────────────
  { key: 'marcela',   firstName: 'Marcela',   lastName: 'Vargas',    phone: '3020000031', email: 'marcela.vargas@gmail.com',     groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'renata',    firstName: 'Renata',    lastName: 'Moreno',    phone: '3020000032', email: 'renata.moreno@gmail.com',      groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'yolanda',   firstName: 'Yolanda',   lastName: 'Figueroa',  phone: '3020000033', email: 'yolanda.figueroa@gmail.com',   groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
  { key: 'stephanie', firstName: 'Stephanie', lastName: 'Lee',       phone: '3020000034', email: 'stephanie.lee@gmail.com',      groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'en', noShowCount: 0 },
  { key: 'monica',    firstName: 'Mónica',    lastName: 'Sandoval',  phone: '3020000035', email: 'monica.sandoval@gmail.com',    groupColor: 'BLUE', isKnownRelation: false, isVip: false, preferredLanguage: 'es', noShowCount: 0 },
] as const;

// Relationships — VIP clients only relate to other VIPs or to their non-VIP known contacts.
// Red ↔ Blue relationships are allowed. Yellow ↔ Red/Blue are never shown together in the UI.
const RELATIONSHIPS: [string, string, number, boolean][] = [
  // Pareja VIP Torres
  ['isabella', 'alejandro', 0.98, true],
  // Familia Rodríguez (María=VIP, Carlos+Ana=red — relationship exists but UI keeps them separate)
  ['maria', 'carlos',       0.95, true],
  ['maria', 'ana',          0.95, true],
  ['carlos', 'ana',         0.90, true],
  // Familia García (Sofía=VIP, Miguel+Valentina=blue)
  ['sofia', 'miguel',       0.97, true],
  ['sofia', 'valentina',    0.88, true],
  ['miguel', 'valentina',   0.85, true],
  // Amigos Torres (Marco+Catalina=red, conocidos de VIPs)
  ['marco', 'catalina',     0.96, true],
  ['isabella', 'catalina',  0.80, true],
  ['alejandro', 'marco',    0.80, true],
  // Grupo trabajo azul
  ['laura', 'patricia_l',   0.75, true],
  ['laura', 'diana_h',      0.75, true],
  ['patricia_l', 'diana_h', 0.72, true],
  // Hermanas Vargas (rojo)
  ['rosa', 'lucia',         0.99, true],
  ['rosa', 'ernesto',       0.95, true],
  ['lucia', 'ernesto',      0.88, false],
  // Grupo yoga (azul)
  ['gabriela', 'andrea',    0.70, true],
  ['gabriela', 'daniela',   0.68, true],
  ['andrea', 'daniela',     0.65, false],
  // Hermanos Mora (rojo)
  ['sebastian', 'nicolas',  0.99, true],
  // Cross rojo↔azul detectados sin confirmar
  ['camila', 'mariana',     0.55, false],
  ['juan', 'andres',        0.52, false],
  ['rosa', 'laura',         0.48, false],
];

async function main() {
  console.log('🌱  Seeding clients (3-color rule: yellow=VIP | red+blue=regular)...\n');

  const ids: Record<string, string> = {};

  for (const c of CLIENTS) {
    const { key, ...data } = c;
    const existing = await prisma.client.findFirst({ where: { phone: data.phone } });
    const record = existing
      ? await prisma.client.update({ where: { id: existing.id }, data })
      : await prisma.client.create({ data });
    ids[key] = record.id;

    const icon = data.isVip ? '🟡' : data.groupColor === 'RED' ? '🔴' : '🔵';
    const rel  = data.isKnownRelation ? ' 🔗' : '';
    console.log(`  ${icon}${rel}  ${data.firstName} ${data.lastName}`);
  }

  console.log(`\n✓ ${CLIENTS.length} clients upserted\n`);
  console.log('🔗  Creating relationships...\n');

  let count = 0;
  for (const [keyA, keyB, confidence, confirmed] of RELATIONSHIPS) {
    const clientAId = ids[keyA];
    const clientBId = ids[keyB];
    if (!clientAId || !clientBId) { console.warn(`  ⚠ missing: ${keyA} or ${keyB}`); continue; }

    await prisma.relationship.upsert({
      where: { clientAId_clientBId: { clientAId, clientBId } },
      update: { confidence, confirmed },
      create: { clientAId, clientBId, confidence, confirmed, confirmedBy: confirmed ? 'seed' : null },
    });

    const mark = confirmed ? '✓' : '?';
    console.log(`  ${mark}  ${keyA} ↔ ${keyB}  (${Math.round(confidence * 100)}%)`);
    count++;
  }

  const vip = CLIENTS.filter(c => c.isVip).length;
  const red = CLIENTS.filter(c => !c.isVip && c.groupColor === 'RED').length;
  const blue = CLIENTS.filter(c => !c.isVip && c.groupColor === 'BLUE').length;
  const confirmed = RELATIONSHIPS.filter(r => r[3]).length;

  console.log(`
── Summary ────────────────────────────────
  🟡 VIP (yellow)   : ${vip}
  🔴 Regular (red)  : ${red}
  🔵 Regular (blue) : ${blue}
  Total             : ${CLIENTS.length}
  Relationships     : ${count} (${confirmed} confirmed)
───────────────────────────────────────────
`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
