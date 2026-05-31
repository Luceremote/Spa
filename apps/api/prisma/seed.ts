import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Admin demo (bcrypt cost 12 = más resistente a brute-force)
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@spa.local" },
    update: {},
    create: {
      email: "admin@spa.local",
      passwordHash,
      name: "Admin Demo",
      role: "ADMIN",
    },
  });

  // Config del sitio
  await prisma.siteConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      spaName: "Serenity Spa",
      tagline: "Tu momento de paz comienza aquí",
      whatsappPhone: "15555555555",
      whatsappMsg: "Hola, me gustaría reservar un servicio en Serenity Spa",
      email: "contacto@serenityspa.com",
      address: "123 Wellness Ave, Miami FL",
      openingHours: "Lun-Sáb 9:00-19:00",
    },
  });

  // Tema por defecto
  await prisma.theme.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  // Categorías
  const categorias = [
    { name: "Masajes", slug: "masajes", order: 1 },
    { name: "Faciales", slug: "faciales", order: 2 },
    { name: "Corporales", slug: "corporales", order: 3 },
    { name: "Manicure & Pedicure", slug: "manicure-pedicure", order: 4 },
  ];

  for (const c of categorias) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  const masajes = await prisma.category.findUnique({ where: { slug: "masajes" } });
  const faciales = await prisma.category.findUnique({ where: { slug: "faciales" } });
  const corporales = await prisma.category.findUnique({ where: { slug: "corporales" } });
  const mani = await prisma.category.findUnique({ where: { slug: "manicure-pedicure" } });

  // Servicios demo
  const servicios = [
    {
      slug: "masaje-relajante",
      name: "Masaje Relajante 60 min",
      description: "Masaje sueco de cuerpo completo para liberar tensión y mejorar la circulación.",
      priceCents: 8000,
      durationMinutes: 60,
      categoryId: masajes?.id,
      featured: true,
    },
    {
      slug: "masaje-piedras-calientes",
      name: "Masaje con Piedras Calientes",
      description: "Combinación de masaje terapéutico y piedras volcánicas para alivio profundo.",
      priceCents: 11000,
      durationMinutes: 90,
      categoryId: masajes?.id,
      featured: true,
    },
    {
      slug: "facial-hidratante",
      name: "Facial Hidratante Premium",
      description: "Limpieza profunda, exfoliación y mascarilla hidratante con ácido hialurónico.",
      priceCents: 9500,
      durationMinutes: 75,
      categoryId: faciales?.id,
      featured: true,
    },
    {
      slug: "facial-antiedad",
      name: "Facial Antiedad",
      description: "Tratamiento con vitamina C y colágeno para reducir líneas finas.",
      priceCents: 12000,
      durationMinutes: 75,
      categoryId: faciales?.id,
    },
    {
      slug: "exfoliacion-corporal",
      name: "Exfoliación Corporal de Café",
      description: "Tratamiento exfoliante con café orgánico, deja la piel suave y luminosa.",
      priceCents: 7500,
      durationMinutes: 45,
      categoryId: corporales?.id,
    },
    {
      slug: "manicure-spa",
      name: "Manicure Spa",
      description: "Manicure completa con exfoliación, masaje de manos y esmaltado.",
      priceCents: 4000,
      durationMinutes: 45,
      categoryId: mani?.id,
    },
    {
      slug: "pedicure-spa",
      name: "Pedicure Spa",
      description: "Pedicure con baño relajante, exfoliación y masaje de pies.",
      priceCents: 5000,
      durationMinutes: 60,
      categoryId: mani?.id,
    },
  ];

  for (const s of servicios) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
  }

  // Cupón demo
  await prisma.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      active: true,
    },
  });

  // Staff demo
  const sara = await prisma.staff.upsert({
    where: { id: "seed-staff-1" },
    update: {},
    create: {
      id: "seed-staff-1",
      name: "Sara López",
      bio: "Especialista en masajes terapéuticos con 8 años de experiencia.",
      workingDays: [1, 2, 3, 4, 5, 6],
      workingFrom: 9 * 60,
      workingTo: 18 * 60,
      active: true,
    },
  });

  // Asociar Sara a los servicios de masajes
  const masajeServicios = await prisma.service.findMany({
    where: { category: { slug: "masajes" } },
    select: { id: true },
  });
  if (masajeServicios.length > 0) {
    await prisma.staff.update({
      where: { id: sara.id },
      data: { services: { set: masajeServicios.map((s) => ({ id: s.id })) } },
    });
  }

  // Categorías financieras por defecto
  const financeCats: { name: string; type: "INCOME" | "EXPENSE"; color: string; icon: string }[] = [
    // Ingresos
    { name: "Servicios", type: "INCOME", color: "#10b981", icon: "sparkles" },
    { name: "Gift Cards", type: "INCOME", color: "#8b5cf6", icon: "gift" },
    { name: "Productos", type: "INCOME", color: "#06b6d4", icon: "shopping-bag" },
    { name: "Otros ingresos", type: "INCOME", color: "#3b82f6", icon: "trending-up" },
    // Gastos
    { name: "Arriendo/Renta", type: "EXPENSE", color: "#ef4444", icon: "home" },
    { name: "Servicios públicos", type: "EXPENSE", color: "#f59e0b", icon: "zap" },
    { name: "Productos spa", type: "EXPENSE", color: "#ec4899", icon: "package" },
    { name: "Personal/Salarios", type: "EXPENSE", color: "#84cc16", icon: "users" },
    { name: "Marketing", type: "EXPENSE", color: "#a855f7", icon: "megaphone" },
    { name: "Equipos", type: "EXPENSE", color: "#0ea5e9", icon: "wrench" },
    { name: "Hogar", type: "EXPENSE", color: "#f97316", icon: "house" },
    { name: "Impuestos", type: "EXPENSE", color: "#dc2626", icon: "file-text" },
    { name: "Reembolsos", type: "EXPENSE", color: "#6b7280", icon: "rotate-ccw" },
    { name: "Otros gastos", type: "EXPENSE", color: "#9ca3af", icon: "more-horizontal" },
  ];
  for (const c of financeCats) {
    await prisma.financeCategory.upsert({
      where: { name_type: { name: c.name, type: c.type } },
      update: {},
      create: { ...c, isDefault: true },
    });
  }

  console.log("Seed completado.");
  console.log("Admin: admin@spa.local / admin123");
  console.log("Cupón demo: WELCOME10 (10% off)");
  console.log("Staff demo: Sara López");
  console.log(`Finanzas: ${financeCats.length} categorías default`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
