/**
 * Prueba las políticas RLS contra el proyecto de Supabase de .env.local.
 * Crea usuarios temporales (admin, odontólogo, recepción y uno sin invitación),
 * verifica qué puede ver y hacer cada uno, y los borra al final.
 * Uso: npm run probar:rls   (requiere migraciones aplicadas; mejor con el seed cargado)
 */
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secreta = process.env.SUPABASE_SECRET_KEY!;
if (!url || !publica || !secreta) {
  console.error("Completa .env.local primero.");
  process.exit(1);
}

const admin = createClient(url, secreta, { auth: { persistSession: false } });
const sufijo = randomBytes(4).toString("hex");
const clave = `Prueba-${randomBytes(8).toString("hex")}`;
const creados: string[] = [];
let fallos = 0;

async function usuario(rol: "admin" | "odontologo" | "recepcion" | null): Promise<SupabaseClient> {
  const correo = `rls-${rol ?? "intruso"}-${sufijo}@prueba.invalid`;
  if (rol) await admin.from("invitaciones").insert({ correo, nombre: `Prueba ${rol}`, rol });
  const { data, error } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
  if (error) throw error;
  creados.push(data.user.id);
  const c = createClient(url, publica, { auth: { persistSession: false } });
  await c.auth.signInWithPassword({ email: correo, password: clave });
  return c;
}

function esperar(nombre: string, ok: boolean) {
  console.log(`${ok ? "✔" : "✘"} ${nombre}`);
  if (!ok) fallos++;
}

const filas = async (c: SupabaseClient, tabla: string) => (await c.from(tabla).select("id").limit(5)).data?.length ?? 0;

try {
  const [a, o, r, x] = await Promise.all([usuario("admin"), usuario("odontologo"), usuario("recepcion"), usuario(null)]);
  const anon = createClient(url, publica, { auth: { persistSession: false } });

  esperar("anónimo no ve pacientes", (await filas(anon, "pacientes")) === 0);
  esperar("usuario sin invitación no ve pacientes", (await filas(x, "pacientes")) === 0);
  esperar("usuario sin invitación no ve la clínica", (await filas(x, "clinica")) === 0);

  esperar("odontólogo ve pacientes", (await filas(o, "pacientes")) > 0);
  esperar("odontólogo NO ve la caja", (await filas(o, "movimientos_caja")) === 0);
  const insOdo = await o.from("movimientos_caja").insert({ tipo: "ingreso", fecha: "2026-01-01", concepto: "x", categoria: "Otro", metodo: "Efectivo", monto: 1 });
  esperar("odontólogo NO puede registrar en caja", Boolean(insOdo.error));

  esperar("recepción ve la caja", (await filas(r, "movimientos_caja")) > 0);
  const updRec = await r.from("clinica").update({ nombre: "Hackeada" }).eq("id", true).select();
  esperar("recepción NO edita la clínica", (updRec.data?.length ?? 0) === 0);
  esperar("recepción NO lee la auditoría", (await filas(r, "auditoria")) === 0);
  const invRec = await r.from("invitaciones").insert({ correo: `x-${sufijo}@prueba.invalid`, nombre: "x", rol: "admin" });
  esperar("recepción NO puede invitar", Boolean(invRec.error));

  const yo = (await r.auth.getUser()).data.user!.id;
  const subir = await r.from("perfiles").update({ rol: "admin" }).eq("id", yo).select();
  esperar("recepción NO se sube a administrador", (subir.data?.length ?? 0) === 0);

  const superA = await a.from("perfiles").update({ es_superadmin: true } as never).eq("id", yo);
  esperar("ni el admin puede tocar es_superadmin", Boolean(superA.error));
  esperar("admin lee la auditoría", (await filas(a, "auditoria")) > 0);

  // Radiografías: solo admin y odontólogo
  esperar("odontólogo ve panorámicas", (await filas(o, "panoramicas")) > 0);
  esperar("recepción NO ve panorámicas", (await filas(r, "panoramicas")) === 0);
  esperar("recepción NO ve marcadores", (await filas(r, "marcadores")) === 0);
  const pid = (await admin.from("panoramicas").select("paciente_id").limit(1).single()).data?.paciente_id;
  const cuenta = pid ? (await r.rpc("paciente_tiene_panoramica", { p_paciente: pid })).data : 0;
  esperar("recepción sí sabe si el paciente tiene panorámica", Number(cuenta) > 0);
  const subirRec = await r.storage.from("panoramicas").upload(`prueba-${sufijo}.png`, new Uint8Array([1, 2, 3]), { contentType: "image/png" });
  esperar("recepción NO sube al bucket de panorámicas", Boolean(subirRec.error));
  const odoRec = await r.from("odontograma_piezas").insert({ paciente_id: pid, pieza_fdi: 11, estado: "caries" });
  esperar("recepción NO edita el odontograma", Boolean(odoRec.error));
} catch (e) {
  console.error("Error inesperado:", e);
  fallos++;
} finally {
  for (const id of creados) await admin.auth.admin.deleteUser(id);
  await admin.from("invitaciones").delete().like("correo", `%-${sufijo}@prueba.invalid`);
}

console.log(fallos ? `\n${fallos} prueba(s) fallaron` : "\nTodas las políticas se comportan como se espera");
process.exit(fallos ? 1 : 0);
