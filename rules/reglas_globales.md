# 📜 REGLAS GLOBALES ANTIGRAVITY (SOP)

**Versión:** 1.1
**Nivel:** Gobierno del Sistema
**Autoridad:** Absoluta
**Aplicación:** Obligatoria y Bloqueante

---

## 1️⃣ Principio Supremo

> **Nada se ejecuta sin reglas.**
> **Nada existe sin Directiva.**
> **Nada se valida sin evidencia.**

Cualquier elemento (script, workflow, app, automatización, IA o infraestructura) que no cumpla estas reglas **debe ser bloqueado automáticamente**.

---

## 2️⃣ Regla de Bootstrap Obligatorio

### 2.1 Ejecución inicial

Todo entorno Antigravity **DEBE ejecutar obligatoriamente**:

```bash
tools/bootstrap.ps1
```

Antes de: ejecutar scripts, correr workflows, desplegar apps, activar MCP o aprobar directivas.
Si el bootstrap falla → **el sistema queda bloqueado**.

---

## 3️⃣ Regla de Estructura Oficial

La siguiente estructura es **OBLIGATORIA**:

```
rules/
directivas/
workflows/
scripts/
apps/
memory/
env/
logs/
tools/
```

---

## 10️⃣ Regla de Directiva Obligatoria

Todo lo que se ejecute **DEBE** apuntar a una Directiva válida.
Ejemplo: `DIRECTIVA ANTIGRAVITY: SYSTEM_BOOTSTRAP (SOP-001)`

Sin Directiva → no hay ejecución ni despliegue.