/**
 * Crea (o promueve) la cuenta de superadministrador de Rido.
 * Uso: npm run superadmin -- correo@rido.do "Nombre Apellido"
 * Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY de .env.local.
 * Imprime una contraseña temporal: cámbiala al entrar desde «¿Olvidaste tu contraseña?».
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");
const [correo, ...nombrePartes] = process.argv.slice(2);
const nombre = nombrePartes.join(" ") || "Rido";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secreta = process.env.SUPABASE_SECRET_KEY;

if (!correo || !url || !secreta) {
  console.error('Uso: npm run superadmin -- correo@dominio "Nombre"   (y completa .env.local)');
  process.exit(1);
}

const sb = createClient(url, secreta, { auth: { persistSession: false } });
const contrasena = randomBytes(9).toString("base64url");

// La invitación hace que el trigger cree el perfil al crear el usuario.
await sb.from("invitaciones").insert({ correo: correo.toLowerCase(), nombre, rol: "admin" });
const { data, error } = await sb.auth.admin.createUser({ email: correo, password: contrasena, email_confirm: true });
if (error && !error.message.toLowerCase().includes("already")) {
  console.error("No se pudo crear el usuario:", error.message);
  process.exit(1);
}

const id = data.user?.id ?? (await sb.from("perfiles").select("id").eq("correo", correo).single()).data?.id;
if (!id) {
  console.error("El usuario ya existía pero no tiene perfil. Bórralo en Authentication → Users y repite.");
  process.exit(1);
}
await sb.from("perfiles").update({ rol: "admin", es_superadmin: true, activo: true }).eq("id", id);

console.log(`Listo. ${correo} es superadministrador.`);
if (data.user) console.log(`Contraseña temporal: ${contrasena}`);
