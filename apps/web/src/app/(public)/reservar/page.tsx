import { fetchServices } from "@/lib/server-fetch";
import { BookingForm } from "./booking-form";

export default async function ReservarPage({
  searchParams,
}: {
  searchParams: { service?: string };
}) {
  const services = await fetchServices();
  return (
    <div className="container py-12 max-w-3xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Reserva tu cita</h1>
        <p className="text-muted-foreground">
          Selecciona el servicio, la fecha y completa tus datos. El pago se realiza al final por
          tarjeta segura.
        </p>
      </header>
      <BookingForm services={services} preselectedServiceId={searchParams.service} />
    </div>
  );
}
