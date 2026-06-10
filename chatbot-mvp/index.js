require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Config ──────────────────────────────────────────────────────────────────
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BUSINESS_NAME     = process.env.BUSINESS_NAME     || 'Mystical Spa';
const BOT_PERSONALITY   = process.env.BOT_PERSONALITY   || 'Eres una asistente amable de un spa.';
const CLAUDE_MODEL      = process.env.CLAUDE_MODEL      || 'claude-haiku-4-5-20251001';
const HISTORY_LENGTH    = parseInt(process.env.HISTORY_LENGTH || '10', 10);
const BACKEND_URL       = process.env.BACKEND_URL       || 'http://localhost:3000/api';
const ALLOWED_NUMBERS   = process.env.ALLOWED_NUMBERS
  ? process.env.ALLOWED_NUMBERS.split(',').map(n => n.trim()).filter(Boolean)
  : [];

const WELCOME_MESSAGE = `¡Hola! Bienvenido a *Munay Bliss LLC*. Soy tu asistente virtual y estoy aquí para ayudarte con información sobre nuestros servicios de Love Life Coaching y Holistic Services, así como para agendar tu cita.

¿En qué puedo asistirte hoy?`;

const GREETING_PATTERN = /^(hola|holi|holis|buenas|buen[oa]s? d[ií]as|buen[oa]s? tardes|buen[oa]s? noches|hi|hey|hello|saludos|qu[eé] tal|qué onda)[\s!.?¡¿]*$/i;

// ── Timezone (office in Orange County, CA → US Pacific Time) ───────────────────
const BUSINESS_TZ = 'America/Los_Angeles';

// "9:00", "14:30" — wall-clock time in Pacific for a UTC ISO string.
function fmtPacificTime(iso) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: BUSINESS_TZ, hour: 'numeric', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

// "lunes, 21 de mayo de 2026" — Pacific calendar date for a UTC ISO string.
function fmtPacificDate(iso) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: BUSINESS_TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(iso));
}

// Current Pacific UTC offset as "-07:00" (PDT) or "-08:00" (PST), DST-aware.
function pacificOffset(date = new Date()) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TZ, timeZoneName: 'longOffset' })
    .formatToParts(date).find(p => p.type === 'timeZoneName');
  return part ? part.value.replace('GMT', '') : '-08:00';
}

const SERVICE_CATEGORIES = `1. Regular Consulting
2. Life Coaching
3. Therapeutic Services`;

const SERVICES_BY_CATEGORY = {
  '1': `*Regular Consulting:*
1. Existing Client Session — 25 min, $55
2. New Client Consulting — 30 min, $75
3. Aura Photography — 30 min, $50`,
  '2': `*Life Coaching:*
1. Life Coaching — 30 min — $88
2. Life Coaching — 60 min — $166
3. Monthly Package — consultar en oficina`,
  '3': `*Therapeutic Services:*
1. Chakra Alignment — $175
2. Sound Vibrational Therapy — $225
3. Treasure Bliss: EF, SVT, CB, CC, AC — $475
4. Private Sound Bath — $350`,
};

if (!ANTHROPIC_API_KEY || ANTHROPIC_API_KEY.startsWith('sk-ant-PEGA')) {
  console.error('\n❌  Falta ANTHROPIC_API_KEY en el archivo .env\n');
  process.exit(1);
}

// ── State ────────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const histories = new Map(); // chatId → [{role, content}]

// ── Backend API helper ────────────────────────────────────────────────────────
function callBackend(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + endpoint);
    const lib = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) },
    };
    const req = lib.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve(d); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'book_appointment',
    description: 'Registra una cita en el sistema. Úsalo cuando el cliente confirme explícitamente que quiere agendar una cita y haya proporcionado fecha y hora.',
    input_schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'Nombre del cliente' },
        lastName:  { type: 'string', description: 'Apellido del cliente. Si no lo proporcionó, usa "Cliente".' },
        startTime: { type: 'string', description: `Fecha y hora en ISO 8601 con offset del Pacífico (California). Ej: para las 3:00 PM PT usa 2026-05-15T15:00:00${pacificOffset()}` },
        serviceName: { type: 'string', description: 'Nombre EXACTO del servicio que eligió el cliente, tal como aparece en el catálogo (ej: "Chakra Alignment", "Life Coaching — 30 min"). Omítelo solo si el cliente no eligió servicio.' },
      },
      required: ['firstName', 'lastName', 'startTime'],
    },
  },
  {
    name: 'get_availability',
    description: 'Consulta los horarios disponibles para una fecha específica.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD, ej: 2026-05-15' },
      },
      required: ['date'],
    },
  },
];

// ── Tool execution ────────────────────────────────────────────────────────────
async function executeTool(toolName, toolInput, phone) {
  if (toolName === 'get_availability') {
    // Resolve clientId by phone so the availability is filtered by privacy rules
    let clientId = '';
    try {
      const clientInfo = await callBackend('GET', `/clients/by-phone/${encodeURIComponent(phone)}`, null);
      if (clientInfo?.id) clientId = clientInfo.id;
    } catch { /* new client, no privacy filter needed */ }

    const query = clientId
      ? `/appointments/availability?date=${toolInput.date}&clientId=${clientId}`
      : `/appointments/availability?date=${toolInput.date}`;
    const slots = await callBackend('GET', query, null);
    if (!Array.isArray(slots) || slots.length === 0) {
      return 'No hay horarios disponibles para ese día.';
    }
    const formatted = slots.map(fmtPacificTime).join(', ');
    return `Horarios disponibles: ${formatted}`;
  }

  if (toolName === 'book_appointment') {
    const result = await callBackend('POST', '/appointments/book-via-bot', {
      phone,
      firstName: toolInput.firstName,
      lastName: toolInput.lastName,
      startTime: toolInput.startTime,
      serviceName: toolInput.serviceName,
    });

    const serviceStr = toolInput.serviceName ? ` (${toolInput.serviceName})` : '';

    if (result.status === 'PENDING_PAYMENT' && result.appointmentId) {
      const dateStr = fmtPacificDate(toolInput.startTime);
      const timeStr = fmtPacificTime(toolInput.startTime);
      try {
        const paymentResult = await callBackend('POST', '/payments/checkout-session', { appointmentId: result.appointmentId });
        if (paymentResult.checkoutUrl) {
          return `Cita registrada para ${toolInput.firstName} ${toolInput.lastName}${serviceStr} el ${dateStr} a las ${timeStr} (hora del Pacífico). La cita NO está confirmada todavía: para confirmarla, el cliente debe pagar el depósito de $20.91 USD ÚNICAMENTE en este enlace:\n${paymentResult.checkoutUrl}\n\nEn cuanto se realice el pago, la cita quedará confirmada automáticamente. No existe ningún otro método de pago.`;
        }
      } catch (e) {
        console.error('Error creating checkout session:', e.message);
      }
      // No se pudo generar el link de pago (ej. Stripe no configurado).
      return `SISTEMA: La cita para ${toolInput.firstName} ${toolInput.lastName} el ${dateStr} a las ${timeStr} (hora del Pacífico) quedó registrada pero NO confirmada, y en este momento NO se pudo generar el enlace de pago. Informa al cliente que hubo un problema técnico generando el enlace de pago y que en breve se le enviará el enlace para pagar el depósito de $20 USD. NO digas que la cita está confirmada. NO inventes ningún otro método de pago (oficina, efectivo, transferencia, etc.): el ÚNICO método es el enlace de pago en línea.`;
    }

    if (result.status === 'CONFIRMED') {
      const dateStr = fmtPacificDate(toolInput.startTime);
      const timeStr = fmtPacificTime(toolInput.startTime);
      return `Cita confirmada exitosamente para ${toolInput.firstName} ${toolInput.lastName}${serviceStr} el ${dateStr} a las ${timeStr}.`;
    }
    if (result.status === 'ALTERNATIVES' && result.options?.length > 0) {
      const alts = result.options.map(fmtPacificTime).join(', ');
      return `Ese horario no está disponible. Horarios alternativos: ${alts}`;
    }
    if (result.status === 'WAITLIST') {
      return 'Ese horario no está disponible. El cliente fue agregado a la lista de espera.';
    }
    return `No se pudo registrar la cita: ${result.message || 'horario no disponible'}`;
  }

  return 'Herramienta desconocida.';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getHistory(chatId) {
  if (!histories.has(chatId)) histories.set(chatId, []);
  return histories.get(chatId);
}

function pushMessage(chatId, role, content) {
  const hist = getHistory(chatId);
  hist.push({ role, content });
  if (hist.length > HISTORY_LENGTH * 2) hist.splice(0, 2);
}

function getNow() {
  const now = new Date();
  return now.toLocaleString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:BUSINESS_TZ });
}

async function askClaude(chatId, phone, userText) {
  pushMessage(chatId, 'user', userText);

  const systemPrompt = `${BOT_PERSONALITY}

Fecha y hora actual: ${getNow()} (hora del Pacífico, California — la oficina está en Orange County, CA).
Horario de atención: lunes a viernes 9:00–19:00 hora del Pacífico (PT). Citas de 25–30 minutos.
IMPORTANTE — ZONA HORARIA: todas las horas que menciones o agendes son hora del Pacífico (California). Cuando llames a book_appointment, el campo startTime DEBE ser ISO 8601 con el offset del Pacífico actual (${pacificOffset()}). Formato: YYYY-MM-DDThh:mm:ss${pacificOffset()} — usa la fecha EXACTA del día que el cliente eligió (no copies el ejemplo). Ej: si el cliente quiere hoy a las 3:30 PM, usa la fecha de hoy con T15:30:00${pacificOffset()}.

ESTILO DE RESPUESTAS:
- Respuestas BREVES y DIRECTAS. Máximo 3–4 líneas.
- Usa SIEMPRE listas numeradas (1, 2, 3) para que el cliente elija con un número.
- No expliques de más. Una pregunta a la vez.

NUESTRAS 3 CATEGORÍAS DE SERVICIOS:
${SERVICE_CATEGORIES}

SUB-SERVICIOS POR CATEGORÍA (muéstralos SOLO cuando el cliente elija una categoría):

Categoría 1 (Regular Consulting):
${SERVICES_BY_CATEGORY['1']}

Categoría 2 (Life Coaching):
${SERVICES_BY_CATEGORY['2']}

Categoría 3 (Therapeutic Services):
${SERVICES_BY_CATEGORY['3']}

FLUJO PARA AGENDAR CITA:
1. Pide nombre completo.
2. Pregunta qué categoría le interesa (muestra las 3 numeradas).
3. Cuando elija categoría, muestra los sub-servicios numerados de ESA categoría.
4. Pregunta qué día prefiere. Si el cliente dice "hoy" o menciona la fecha actual, acepta "hoy" como opción válida — NO lo desvíes a mañana.
5. Llama a get_availability para ESA fecha y muestra los horarios disponibles.
6. Cuando el cliente elija un horario de la lista, confirma el resumen (nombre, fecha, hora) y pide confirmación.
7. Al recibir confirmación, llama INMEDIATAMENTE a book_appointment incluyendo serviceName con el nombre EXACTO del servicio que eligió (tal como aparece en el catálogo).

REGLAS IMPORTANTES:
- NUNCA preguntes "¿eres cliente nuevo o existente?". Los nombres de servicios son etiquetas internas.
- NUNCA desalientes al cliente de agendar para hoy. Si hay horario de atención restante (por ejemplo, son las 3 PM y el horario cierra a las 7 PM), hay citas disponibles — muéstralas.
- Si el cliente dice "no quiero [algo]" en respuesta a una sugerencia tuya, interpreta "no" como rechazo a tu sugerencia, no como rechazo al horario que mencionen. Ejemplo: si sugieres "¿mañana?" y el cliente dice "no, quiero a las 3:30 pm", eso significa que quiere HOY a las 3:30 PM.
- NUNCA marques un horario como no disponible basándote en tu memoria de la conversación. La disponibilidad SOLO la determina el sistema (get_availability y book_appointment). Si el cliente pide un horario, llama a book_appointment y deja que el sistema responda.
- Si get_availability devuelve "No hay horarios disponibles", sugiere otro día (lunes a viernes).
- FECHAS Y DÍAS DE LA SEMANA: calcula las fechas a partir de la "Fecha y hora actual" indicada arriba. Antes de mencionar un día con su fecha (ej. "martes 11 de junio"), VERIFICA que ese día de la semana realmente corresponda a esa fecha. Si el cliente pide un día de la semana (ej. "el martes"), usa la fecha del PRÓXIMO día con ese nombre.

💳 REGLA CRÍTICA — PAGOS:
- Estas reglas de pago aplican SOLO cuando el sistema pide un depósito (resultado con "Cita registrada" y un enlace de pago). Si el resultado del sistema dice "Cita confirmada exitosamente", la cita está CONFIRMADA sin depósito: dilo así y NO menciones pagos, depósitos ni enlaces.
- El depósito de $20.91 USD se paga ÚNICAMENTE a través del enlace de pago en línea que genera el sistema (book_appointment). NO existe ningún otro método de pago.
- JAMÁS inventes o sugieras otras formas de pago: NO digas "paga en la oficina", "en efectivo", "transferencia", "al llegar", ni nada parecido. Si lo haces, estás engañando al cliente.
- Si el cliente pregunta cómo pagar y ya tienes el enlace, dale el enlace. Si por algún motivo no hay enlace disponible, dile que hubo un problema técnico y que en breve se le enviará el enlace; NUNCA ofrezcas un método alternativo.
- Una cita con pago pendiente NO está confirmada. No digas "confirmada" hasta que el sistema reporte el pago realizado.

Tienes acceso a herramientas para consultar disponibilidad y registrar citas en el sistema.
- Usa get_availability antes de mostrar horarios o confirmar.
- Cuando confirmes una cita, dile al cliente el día y hora exactos en formato corto.

⚠️ REGLA CRÍTICA — NUNCA INVENTES UNA CONFIRMACIÓN:
JAMÁS digas "cita confirmada", "agendada", "registrada", "reservada" o equivalentes SIN HABER LLAMADO PRIMERO al tool book_appointment y haber recibido un resultado exitoso del sistema.

El flujo CORRECTO de confirmación es:
1. El cliente dice "sí" o confirma de algún modo.
2. INMEDIATAMENTE llamas al tool book_appointment con firstName, lastName y startTime (ISO 8601 con offset del Pacífico, ej: ...T15:30:00${pacificOffset()} para las 3:30 PM de HOY).
3. Esperas el resultado del tool.
4. Lee el resultado del tool y responde EXACTAMENTE según lo que diga:
   - Si contiene "Cita confirmada exitosamente": dile al cliente que su cita está CONFIRMADA (día, hora y servicio). NO menciones pagos.
   - Si contiene "Cita registrada" (pendiente de pago): responde que está pendiente de pago y entrega el enlace que venga en el resultado.
5. Si el resultado contiene "no disponible" o "alternativas", comunícalo y ofrece las alternativas que devuelve el sistema.

CRÍTICO: SIEMPRE llama a book_appointment cuando el cliente confirma — incluso si crees que el horario podría estar ocupado. Es el sistema quien decide, no tú. Nunca respondas "no disponible" sin haber llamado al tool primero.

Si el cliente confirma y tú respondes "no disponible" SIN haber llamado a book_appointment, estás tomando una decisión que le corresponde al sistema. Esto es inaceptable.`;

  let messages = getHistory(chatId);
  let finalReply = '';

  // Agentic loop: Claude puede llamar tools múltiples veces
  while (true) {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'tool_use') {
      // Añadir respuesta del asistente (con tool_use blocks) al historial
      messages = [...messages, { role: 'assistant', content: response.content }];

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        console.log(`🔧  Tool: ${block.name}`, JSON.stringify(block.input));
        const result = await executeTool(block.name, block.input, phone);
        console.log(`🔧  Result: ${result}`);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }

      // Añadir resultados de tools y continuar
      messages = [...messages, { role: 'user', content: toolResults }];
      continue;
    }

    // stop_reason === 'end_turn' — respuesta final
    finalReply = response.content.find(b => b.type === 'text')?.text ?? '(sin respuesta)';
    break;
  }

  // Guardar solo el mensaje del usuario y la respuesta final en el historial persistente
  pushMessage(chatId, 'assistant', finalReply);
  return finalReply;
}

function isAllowed(from) {
  if (ALLOWED_NUMBERS.length === 0) return true;
  const number = from.replace('@c.us', '');
  return ALLOWED_NUMBERS.includes(number);
}

function phoneFromJid(jid) {
  return jid.replace('@c.us', '').replace('@lid', '');
}

// ── WhatsApp client ──────────────────────────────────────────────────────────
const waClient = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

waClient.on('qr', qr => {
  const fs = require('fs');
  const qrImagePath = path.join(__dirname, 'qr.png');
  fs.writeFileSync(path.join(__dirname, 'qr-data.txt'), qr, 'utf8');
  QRCode.toFile(qrImagePath, qr, { width: 400, margin: 2 }, (err) => {
    if (err) { console.error('❌  Error generando QR:', err.message); return; }
    console.log(`📷  QR generado → ${qrImagePath}`);
    console.log('📱  Escanea el QR con WhatsApp para iniciar sesión.');
  });
});

waClient.on('authenticated', () => {
  console.log('✅  Autenticado — guardando sesión...');
});

waClient.on('ready', () => {
  console.log(`\n✅  Bot listo. Modelo: ${CLAUDE_MODEL}`);
  console.log(`📋  Personalidad: ${BOT_PERSONALITY.slice(0, 80)}...`);
  if (ALLOWED_NUMBERS.length > 0) {
    console.log(`🔒  Solo responde a: ${ALLOWED_NUMBERS.join(', ')}`);
  } else {
    console.log('🌐  Responde a TODOS los chats');
  }
  console.log('\nEsperando mensajes...\n');
});

waClient.on('message', async msg => {
  if (msg.fromMe) return;
  if (msg.isStatus) return;
  if (!msg.body || msg.body.trim() === '') return;
  if (!isAllowed(msg.from)) return;

  const chatId = msg.from;
  const phone  = phoneFromJid(msg.from);
  const text   = msg.body.trim();

  console.log(`📩  [${new Date().toLocaleTimeString()}] ${chatId}: ${text.slice(0, 60)}`);

  try {
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    let reply;
    // Saludo inicial: respuesta fija y deterministic. Solo si es el primer mensaje de la conversación.
    const history = getHistory(chatId);
    if (history.length === 0 && GREETING_PATTERN.test(text)) {
      reply = WELCOME_MESSAGE;
      pushMessage(chatId, 'user', text);
      pushMessage(chatId, 'assistant', reply);
    } else {
      reply = await askClaude(chatId, phone, text);
    }

    await msg.reply(reply);
    console.log(`📤  Bot → ${reply.slice(0, 80)}`);
  } catch (err) {
    console.error('❌  Error:', err.message);
    await msg.reply('Lo siento, tuve un problema al procesar tu mensaje. Por favor intenta de nuevo en un momento.');
  }
});

waClient.on('disconnected', reason => {
  console.log('⚠️  Desconectado:', reason);
});

waClient.initialize();
