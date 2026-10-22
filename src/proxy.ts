import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLICAS = ["/login", "/recuperar", "/auth", "/demo", "/api/n8n"];
const esPublica = (path: string) => PUBLICAS.some((p) => path === p || path.startsWith(`${p}/`));

/** Refresca la sesión de Supabase y manda al login a quien no la tenga. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const { pathname } = request.nextUrl;

  // Vista previa sin Supabase: basta con haber elegido un rol de ejemplo.
  if (!url || !key) {
    if (!esPublica(pathname) && !request.cookies.get("bona_vista_previa")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, headers) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await sb.auth.getUser();
  if (!data.user && !esPublica(pathname)) {
    const destino = new URL("/login", request.url);
    if (pathname !== "/") destino.searchParams.set("volver", pathname);
    return NextResponse.redirect(destino);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
