# Bonadent

Sistema de gestión para **una clínica dental**. Incluye:

- Resumen de la clínica.
- Agenda por odontólogo.
- Recordatorios por WhatsApp.
- Pacientes, con panorámica y odontograma.
- Caja.
- Cotizaciones con PDF.
- Demostración pública del bot.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Supabase (Postgres, Auth, Storage y RLS), Motion, Recharts, Zod, @react-pdf/renderer y ExcelJS.

El prototipo original y las instrucciones del bot están en [`referencia/`](referencia/), solo como referencia de reglas de negocio.

---

## 1. Correr en tu computadora

Requisito: **Node 22 o superior**.

```bash
npm install
npm run dev          # http://localhost:3000
```

### Vista previa (sin Supabase)

Mientras `.env.local` no tenga las claves de Supabase, la app arranca en **vista previa**:

- En `/login` eliges un rol (Administrador, Odontólogo o Recepción).
- Los **datos de ejemplo son ficticios** y viven **en la memoria del servidor**. Puedes crear citas, cotizaciones, subir panorámicas, etc. Al reiniciar `npm run dev` vuelven los datos originales. *Ajustes → Datos de ejemplo → Reiniciar* hace lo mismo.
- Nada se guarda en el navegador.
- La panorámica de prueba es una **imagen sintética** que dibuja el servidor; no es de ningún paciente.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build && npm start` | Compilación y servidor de producción |
| `npm test` | Pruebas de las reglas críticas (saldo, recordatorios, citas repetidas, choque de horario, odontograma, horarios libres) |
| `npm run typecheck` | Revisión de tipos |
| `npm run seed:generar` | Regenera `supabase/seed.sql` desde `src/datos/ejemplo.ts` |
| `npm run superadmin -- correo "Nombre"` | Crea la cuenta de superadministrador de Rido |
| `npm run probar:rls` | Prueba las políticas RLS contra tu proyecto de Supabase |

---

## 2. Conectar Supabase (al cerrar la venta)

1. **Crear el proyecto** en [supabase.com](https://supabase.com) → *New project*.

2. **Copiar las claves** en `.env.local`. Están en *Project Settings → API Keys*:

   | Variable | Clave |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | *publishable* (o *anon public*) |
   | `SUPABASE_SECRET_KEY` | *secret* (o *service_role*). **Solo servidor**, nunca en git |

3. **Crear las tablas.** En *SQL Editor* ejecuta **en orden**:
   1. `supabase/migrations/20261021000001_base.sql` (clínica, equipo, roles, auditoría)
   2. `supabase/migrations/20261021000002_operacion.sql` (pacientes, citas, recordatorios, caja, cotizaciones)
   3. `supabase/migrations/20261021000003_clinico.sql` (panorámicas, odontograma, IA y buckets privados)
   4. `supabase/seed.sql` (opcional: datos de ejemplo con `es_ejemplo = true`)

   Con la CLI también se puede: `npx supabase login`, `npx supabase link --project-ref <ref>` y `npx supabase db push`.

4. **Configurar Auth**:
   - *Sign In / Providers → Email*: **desactiva "Allow new users to sign up"**. Solo entra quien fue invitado.
   - *URL Configuration*:
     - *Site URL* = tu dominio, o `http://localhost:3000` para probar.
     - Agrega `<tu dominio>/**` a *Redirect URLs*.
   - *Emails → Templates*: en **Invite user** y **Reset password**, cambia el enlace por:

     ```
     {{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite&siguiente=/cuenta/contrasena
     ```

     En *Reset password* usa `type=recovery`.

5. **Crear el superadministrador**:

   ```bash
   npm run superadmin -- tu-correo@rido.do "Tu Nombre"
   ```

   Imprime una contraseña temporal. Cámbiala desde «¿Olvidaste tu contraseña?».

6. **Invitar al equipo** desde *Ajustes → Equipo*.

7. **Verificar la seguridad** con `npm run probar:rls`. Crea usuarios temporales por rol, comprueba qué ve cada uno y los borra.

### Roles

| Rol | Puede |
|---|---|
| Administrador | Todo, incluidos el equipo, el catálogo, los ajustes y la actividad (auditoría) |
| Odontólogo | Agenda, todos los pacientes, cotizaciones, odontograma y panorámicas. **Sin caja** |
| Recepción | Agenda, pacientes, recordatorios, caja y cotizaciones. **No ve radiografías**, solo sabe si el paciente tiene |

### Seguridad de las radiografías

- La seguridad real está en las **políticas RLS** de Postgres y del Storage, no en la interfaz.
- Las panorámicas viven en un **bucket privado**. La app las entrega por `/api/panoramicas/[id]`: revisa el rol y redirige a una **URL firmada que vence en 2 minutos**. Nunca hay URLs públicas.
- Cada vez que alguien abre una panorámica queda un registro **"vio"** en la auditoría, además de crear, editar y borrar.

---

## 3. Bot de WhatsApp (n8n)

Flujo existente: **"Clínica Dental · Bot de recordatorios WhatsApp"** (ID `tA98h2EQOxFvT49K`).

### Endpoints de la app

Todos piden `Authorization: Bearer <N8N_TOKEN>`. Pon un valor largo y aleatorio en `N8N_TOKEN`. En la vista previa el token es `vista-previa`.

| Método y ruta | Para qué |
|---|---|
| `GET /api/n8n/recordatorios` | Recordatorios que deben salir **hoy**: avisos del mismo día, avisos de 3 días antes y fallidos para reintentar |
| `POST /api/n8n/recordatorios/resultado` | Marca cada uno como `enviado` o `fallido` |
| `POST /api/n8n/respuestas` | **Preparado y apagado.** Recibe «Confirmo» o «Aplazar» (`N8N_RESPUESTAS_ACTIVAS=true`) |

Respuesta de `GET /api/n8n/recordatorios`:

```json
{ "fecha": "2026-10-21", "total": 2, "recordatorios": [
  { "recordatorioId": "…", "citaId": "…", "tipo": "previo", "telefono": "18095550111", "nombre": "Ana",
    "fecha": "sábado, 24 de octubre", "hora": "9:00 a. m.", "doctor": "Dra. Laura Peña",
    "clinica": "Clínica Dental Sonrisa", "direccion": "Calle del Sol #45, Santiago", "mensaje": "…" } ],
  "sinTelefono": [] }
```

Cuerpo de `POST /api/n8n/recordatorios/resultado`:

```json
{ "resultados": [ { "recordatorioId": "…", "estado": "enviado" },
                  { "recordatorioId": "…", "estado": "fallido", "error": "Número sin WhatsApp" } ] }
```

### Cambios en el flujo de n8n

1. **Disparador diario.** Agrega un nodo *Schedule Trigger*:
   - *Cron*: `45 7 * * *`.
   - *Timezone*: `America/Santo_Domingo` (Settings del flujo → Timezone).
2. **HTTP Request (GET):**
   - URL: `https://<tu-dominio>/api/n8n/recordatorios`.
   - *Authentication → Generic → Header Auth*: credencial con `Authorization: Bearer <N8N_TOKEN>`.
3. **Split Out** sobre `recordatorios`.
4. **Enviar WhatsApp (plantilla).** Es el nodo que ya existe.
   - Plantilla: `recordatorio_cita_3dias` si `tipo` es `previo`, `recordatorio_cita_hoy` si es `hoy`. Usa un nodo *If* o una expresión.
   - Variables:

     | Variable | Campo |
     |---|---|
     | `{{1}}` | `nombre` |
     | `{{2}}` | `fecha` |
     | `{{3}}` | `hora` |
     | `{{4}}` | `doctor` |
     | `{{5}}` | `clinica` |
     | `{{6}}` | `direccion` |

   - Destinatario: `telefono`.
   - En *Settings* del nodo, activa **Continue On Fail** para que un error no detenga a los demás.
5. **Set:** arma `{ recordatorioId, estado: $json.error ? "fallido" : "enviado", error: $json.error?.message }`.
6. **Aggregate** todos los ítems en `resultados`.
7. **HTTP Request (POST)** a `https://<tu-dominio>/api/n8n/recordatorios/resultado`, con la misma credencial y el cuerpo `{ "resultados": … }`.
8. Prueba con tu propio número, publica el flujo y actívalo.

Lo que el bot no pueda enviar aparece en *Recordatorios → Fallidos* para enviarlo a mano.

### Respuestas «Confirmo» / «Aplazar» (fase posterior)

1. Agregar los botones de respuesta rápida a las plantillas y aprobarlas en Meta.
2. Hacer que el webhook de WhatsApp en n8n llame a `POST /api/n8n/respuestas`:
   - `{ "citaId", "respuesta": "confirmo" }` → la cita pasa a **confirmada**.
   - `{ "citaId", "respuesta": "aplazar" }` → devuelve 3 horarios libres del **mismo odontólogo**, dentro del horario de la clínica.
   - `{ "citaId", "respuesta": "aplazar", "eleccion": { "fecha", "hora" } }` → mueve la cita y reprograma los recordatorios.
3. Activar con `N8N_RESPUESTAS_ACTIVAS=true`.

---

## 4. IA (modo de prueba)

| Función | En la vista previa |
|---|---|
| **Cotizaciones** | El asistente responde con **preguntas y respuestas fijas**, como un FAQ. Arma la cotización solo con servicios del catálogo y sus precios exactos |
| **Panorámicas** | **Apagadas por defecto** (*Ajustes → IA*). Al activarlas, «Pedir sugerencia» marca zonas fijas para revisar |

Las sugerencias de panorámicas siempre llevan la etiqueta «Sugerencia, no es diagnóstico. Confirmar por el odontólogo». Nunca cambian el odontograma solas: el odontólogo acepta o descarta cada una.

Para usar un modelo real, solo se cambia `src/lib/ia/asistente.ts` y la llamada se hace desde el servidor. La clave va en `.env.local` y nunca en el navegador.

---

## 5. Desplegar en Vercel

1. Sube el repositorio a GitHub e impórtalo en [vercel.com](https://vercel.com).
2. Copia las variables de `.env.local` en *Settings → Environment Variables*. `NEXT_PUBLIC_SITE_URL` debe ser el dominio real.
3. En Supabase, cambia *Site URL* y *Redirect URLs* al dominio de Vercel.
4. La demo pública queda en `https://<tu-dominio>/demo`.

> La vista previa en memoria es solo para demostrar en local. En Vercel, conecta Supabase.

---

## 6. Estructura

```
src/
  app/
    (auth)/            login, recuperar, crear contraseña
    (app)/             pantallas con barra lateral
      resumen/ agenda/ recordatorios/ caja/ cotizaciones/ ajustes/
      pacientes/[id]/clinico/   visor, comparador, odontograma, panel de pieza
    demo/              demostración pública del bot
    api/               panorámicas, comprobantes, Excel, PDF y endpoints de n8n
  design/tokens.css    ÚNICO archivo del sistema de diseño (oscuro y claro)
  components/bona/     tarjetas, calendario, anillos, chips, mini gráficas…
  components/ui/       formularios, diálogos, pestañas, menús y avisos
  datos/               repo.ts (Supabase o memoria) y datos de ejemplo
  lib/reglas/          reglas de negocio puras y probadas
  lib/ia/              asistente (modo de prueba)
  proxy.ts             protege rutas y refresca la sesión
supabase/migrations/   SQL versionado con RLS
scripts/               superadmin, prueba de RLS y generador del seed
tests/                 Vitest
```

## 7. Fases

- [x] **1. Base:** sistema de diseño, autenticación, roles, invitaciones, auditoría y Resumen.
- [x] **2. Pacientes, agenda y recordatorios:** día, semana y mes; choque de horario; repetición; envío manual.
- [x] **3. Caja y cotizaciones:** comprobantes, Excel, PDF, asistente de prueba, estados y saldo.
- [x] **4. Panorámica y odontograma:** visor, escaneo, comparador, marcadores, FDI, historial, cotizar, agendar e IA opcional.
- [x] **5. Demo del bot y endpoints de n8n.**
- [ ] Conectar Supabase y correr `npm run probar:rls` (al cerrar la venta).
