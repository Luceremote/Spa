-- CreateIndex: acelera la caja del día (pagos PAID por fecha)
CREATE INDEX "Payment_status_paidAt_idx" ON "Payment"("status", "paidAt");
