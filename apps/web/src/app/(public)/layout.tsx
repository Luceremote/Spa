import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { WhatsAppFab } from "@/components/whatsapp-fab";
import { PromoBannerClient } from "@/components/promo-banner";
import { PromoPopupClient } from "@/components/promo-popup";
import { fetchSiteConfig, fetchBanner, fetchPopup } from "@/lib/server-fetch";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [config, banner, popup] = await Promise.all([
    fetchSiteConfig(),
    fetchBanner(),
    fetchPopup(),
  ]);
  return (
    <>
      <PromoBannerClient banner={banner} />
      <Navbar config={config} />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <Footer config={config} />
      <WhatsAppFab phone={config.whatsappPhone} message={config.whatsappMsg} />
      <PromoPopupClient popup={popup} />
    </>
  );
}
