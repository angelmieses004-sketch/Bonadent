import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env, secretKey } from "@/lib/env";

/** Cliente con la sesión del usuario (respeta RLS). */
export async function supabaseServidor() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}

/** Cliente administrativo (ignora RLS). Solo para invitar usuarios y tareas internas. */
export function supabaseAdmin() {
  return createClient(env.supabaseUrl, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
