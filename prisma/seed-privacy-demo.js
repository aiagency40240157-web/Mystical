/**
 * Seed de demostración para probar las reglas de confidencialidad (privacy engine).
 *
 * Escenarios que crea:
 *  1. Regla de relación conocida (4 h): "Thomas Miller" tiene relación CONFIRMADA con
 *     el cliente de WhatsApp del usuario (phone 92754264764514, "Luis Perez").
 *     Thomas tiene citas el MIÉRCOLES 17 JUN 2026 a las 09:00, 13:00 y 17:00 PT,
 *     que bajo la regla de ±4 h bloquean TODO el día para Luis.
 *  2. Regla de color de grupo: "Rocio Marquez" (RED) tiene cita el JUEVES 18 JUN 2026
 *     a las 10:00 PT. "Yamila Torres" (YELLOW) no podrá reservar ese día, y viceversa.
 *
 * Uso:  node prisma/seed-privacy-demo.js   (DATABASE_URL decide la BD destino)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WHATSAPP_PHONE = '92754264764514'; // cliente real del usuario (bot)
const DURATION_MS = 30 * 60_000;

// 2026-06-17 PT (UTC-7): 09:00 PT = 16:00Z, 13:00 PT = 20:00Z, 17:00 PT = 00:00Z del día 18
const THOMAS_APPTS = [
  '2026-06-17T16:00:00.000Z',
  '2026-06-17T20:00:00.000Z',
  '2026-06-18T00:00:00.000Z',
];
// 2026-06-18 10:00 PT = 17:00Z
const ROCIO_APPT = '2026-06-18T17:00:00.000Z';

async function upsertClient(firstName, lastName, phone, groupColor = null) {
  const existing = await prisma.client.findFirst({ where: { firstName, lastName } });
  if (existing) {
    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: { phone, groupColor },
    });
    console.log(`= ${firstName} ${lastName} (ya existía${groupColor ? `, color ${groupColor}` : ''})`);
    return updated;
  }
  const created = await prisma.client.create({
    data: { firstName, lastName, phone, groupColor, preferredLanguage: 'es' },
  });
  console.log(`+ ${firstName} ${lastName}${groupColor ? ` [${groupColor}]` : ''}`);
  return created;
}

async function ensureAppointment(clientId, startIso, label) {
  const startTime = new Date(startIso);
  const endTime = new Date(startTime.getTime() + DURATION_MS);
  const existing = await prisma.appointment.findFirst({
    where: { clientId, startTime, status: { not: 'CANCELLED' } },
  });
  if (existing) {
    console.log(`= cita ya existía: ${label}`);
    return;
  }
  await prisma.appointment.create({
    data: { clientId, startTime, endTime, status: 'CONFIRMED' },
  });
  console.log(`+ cita: ${label}`);
}

async function main() {
  // Cliente del usuario (creado por el bot); si no existe, se crea
  let luis = await prisma.client.findFirst({ where: { phone: WHATSAPP_PHONE } });
  if (!luis) {
    luis = await prisma.client.create({
      data: { firstName: 'Luis', lastName: 'Perez', phone: WHATSAPP_PHONE },
    });
    console.log('+ Luis Perez (cliente WhatsApp, no existía)');
  } else {
    console.log(`= cliente WhatsApp: ${luis.firstName} ${luis.lastName}`);
  }

  // ── Escenario 1: relación conocida (regla de 4 horas) ─────────────────────
  const thomas = await upsertClient('Thomas', 'Miller', '15550000001');
  await prisma.relationship.upsert({
    where: { clientAId_clientBId: { clientAId: luis.id, clientBId: thomas.id } },
    update: { confirmed: true, confidence: 0.85, confirmedBy: 'seed-privacy-demo' },
    create: {
      clientAId: luis.id,
      clientBId: thomas.id,
      confirmed: true,
      confidence: 0.85,
      confirmedBy: 'seed-privacy-demo',
    },
  });
  console.log(`+ relación CONFIRMADA: ${luis.firstName} ${luis.lastName} ↔ Thomas Miller`);
  await ensureAppointment(thomas.id, THOMAS_APPTS[0], 'Thomas Miller — mié 17 jun, 09:00 PT');
  await ensureAppointment(thomas.id, THOMAS_APPTS[1], 'Thomas Miller — mié 17 jun, 13:00 PT');
  await ensureAppointment(thomas.id, THOMAS_APPTS[2], 'Thomas Miller — mié 17 jun, 17:00 PT');

  // ── Escenario 2: conflicto de color (RED vs YELLOW) ───────────────────────
  const rocio = await upsertClient('Rocio', 'Marquez', '15550000002', 'RED');
  await upsertClient('Yamila', 'Torres', '15550000003', 'YELLOW');
  await ensureAppointment(rocio.id, ROCIO_APPT, 'Rocio Marquez [RED] — jue 18 jun, 10:00 PT');

  console.log(`
──────────────────────────────────────────────────────
PRUEBAS ESPERADAS:
1. Bot (WhatsApp): pide disponibilidad para el MIÉRCOLES 17 JUN.
   → Debe responder que NO hay horarios (las citas de Thomas Miller
     bloquean todo el día por la regla de 4 h). Sin explicar por qué.
2. Panel: nueva cita para Yamila Torres [YELLOW] el JUEVES 18 JUN.
   → Rechazada con alternativas/waitlist (Rocio [RED] ya tiene cita ese día).
3. Panel: la misma cita para Yamila el VIERNES 19 JUN. → Permitida.
4. Bot: disponibilidad para el VIERNES 19 JUN. → Horarios normales
   (la relación solo bloquea días con citas de Thomas).
──────────────────────────────────────────────────────`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
