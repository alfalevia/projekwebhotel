-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('BELUM_DIBAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DITOLAK');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER_BANK', 'TUNAI');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'BELUM_DIBAYAR';

-- CreateIndex
CREATE INDEX "Reservation_paymentStatus_idx" ON "Reservation"("paymentStatus");

-- CreateIndex
CREATE INDEX "Room_roomTypeId_idx" ON "Room"("roomTypeId");
