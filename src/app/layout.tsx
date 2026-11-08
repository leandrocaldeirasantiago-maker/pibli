import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ProvedorTema } from "@/components/tema/provedor-tema";
import { LayoutPibli } from "@/components/layout/layout-pibli";
import { RegistrarSW } from "@/components/pwa/registrar-sw";
import { obterUsuarioAtual } from "@/lib/supabase/servidor";
import { contarNaoLidas } from "@/lib/cultos/consultas";
import { obterLogoUrl } from "@/lib/configuracoes/identidade";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Igreja Batista em Largo da Ideia â€” GestÃ£o EclesiÃ¡stica",
  description: "Sistema de gestÃ£o eclesiÃ¡stica da Igreja Batista em Largo da Ideia.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = {
  themeColor: "#142C4D",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = await obterUsuarioAtual();
  // Falha na contagem nÃ£o pode derrubar a pÃ¡gina: o sino apenas some o nÃºmero.
  const naoLidas = usuario ? await contarNaoLidas().catch(() => 0) : 0;
  const logoUrl = usuario ? await obterLogoUrl() : null;
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${sans.variable} ${serif.variable}`}>
      <body>
     <ProvedorTema>
       <LayoutPibli
         usuario={usuario}
         naoLidas={naoLidas}
         logoUrl={logoUrl}
       >
         {children}
       </LayoutPibli>
       {/* <RegistrarSW /> */}
     </ProvedorTema>
      </body>
    </html>
  );
}
