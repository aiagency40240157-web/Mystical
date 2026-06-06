# DIRECTIVA ANTIGRAVITY: FIX_TEST_FAILURES (SOP-002)

## Objetivo
Corregir todos los fallos y errores de compilación de TypeScript en el suite de pruebas (`npm run test`).

## Cambios Propuestos

### Componente: Pruebas Unitarias y de Integración

#### [MODIFY] [privacy-engine.spec.ts](file:///f:/mystical/test/privacy/privacy-engine.spec.ts)
- Actualizar los mocks helper `makePrisma` para incluir la propiedad `relationship.findMany`.
- Corregir los objetos `Date` en los tests de break overlap para reflejar las horas de almuerzo correctas en Pacific Time (UTC-7 en junio), convirtiendo horas locales de break a UTC:
  - `BREAK_OVERLAP_START`: `13:30` PDT -> `20:30` UTC.
  - `BREAK_OVERLAP_END`: `14:00` PDT -> `21:00` UTC.
  - Ajustar fechas relativas de inicio y fin en los tests correspondientes.
- Mockear `relationship.findMany` para retornar una relación simulada confirmada en las pruebas de `known-relation 4h gap`, de manera que `hasRelationshipConflict` no retorne `false` prematuramente.

#### [MODIFY] [whatsapp-traffic.spec.ts](file:///f:/mystical/test/whatsapp/whatsapp-traffic.spec.ts)
- Corregir la aserción de formato en `formats ALTERNATIVES response with options list in EN` de `expect(msg).toContain('11:00')` a `expect(msg).toContain('04:00 AM')` porque el formateador convierte la fecha de UTC a la hora local PDT.

#### [MODIFY] [failure-injection.spec.ts](file:///f:/mystical/test/failure-injection/failure-injection.spec.ts)
- Agregar un sexto argumento simulado (`clientsService`) en la inicialización de `AppointmentsService`.

#### [MODIFY] [slot-booking.concurrency.spec.ts](file:///f:/mystical/test/concurrency/slot-booking.concurrency.spec.ts)
- Agregar un sexto argumento simulado (`clientsService`) en la inicialización de `AppointmentsService`.

#### [MODIFY] [rbac.spec.ts](file:///f:/mystical/test/security/rbac.spec.ts)
- Pasar un segundo argumento simulado (`jwtService`) en la instanciación del `RolesGuard`.

## Restricciones/Casos Borde
- **Nota:** No simular depósitos con un valor genérico como `$20.00` (2000 centavos) en las pruebas de webhook. Usar exactamente `2091` centavos (`DEPOSIT_AMOUNT_CENTS`).
- **Nota:** Asegurarse de mockear `prisma.relationship.findMany` al probar las reglas de privacidad.
- **Nota:** Recordar que `AppointmentsService` ahora recibe 6 argumentos obligatorios en el constructor.
- **Nota:** El `RolesGuard` recibe reflector y `jwtService` como dependencias obligatorias.

## Verificación
- Ejecutar `npm run test` y verificar que todas las pruebas pasen con código de salida 0.
