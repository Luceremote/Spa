import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { fetchSiteConfig } from "@/lib/server-fetch";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const config = await fetchSiteConfig();
  return (
    <>
      <Navbar config={config} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer config={config} />
      <WhatsAppFab phone={config.whatsappPhone} message={config.whatsappMsg} />
    </>
  );
}
