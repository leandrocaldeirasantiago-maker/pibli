const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");
const dev = process.env.NODE_ENV !== "production";

// PolÃ­tica de conteÃºdo. Mantida em modo "somente relatÃ³rio" atÃ© ser validada no navegador
// (ver docs/ETAPA-7.md). Next.js exige 'unsafe-inline' em scripts sem nonce.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseUrl}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}`.trim(),
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: process.cwd(),
  reactStrictMode: true,
  poweredByHeader: false,
  // O sistema nÃ£o usa next/image nem imagens remotas. Desligar o otimizador de imagens tira de cena o endpoint /_next/image,
  // alvo de vÃ¡rios avisos de seguranÃ§a do Next (incluindo execuÃ§Ã£o remota de cÃ³digo com SVG/AVIF). Ver docs/PENDENCIAS.md, item 13.
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/pibli-app.html",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/((?!pibli-app\.html$).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Microfone liberado para o afinador do mÃ³dulo Louvor; cÃ¢mera e localizaÃ§Ã£o ficam bloqueadas.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      {
        // PÃ¡ginas autenticadas e arquivos de dados nunca devem ser guardados em cache compartilhado.
        source: "/((?!_next/static|_next/image|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest).*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
