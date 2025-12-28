/*
  Warnings:

  - The values [ADMIN,PROVIDER,OPERATOR] on the enum `RolUsuario` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoVehiculoProveedor" AS ENUM ('GRUA', 'GRUA_PESADA', 'TECNICO', 'CERRAJERO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoDisponibilidad" AS ENUM ('DISPONIBLE', 'OCUPADO', 'EN_PAUSA', 'FUERA_DE_ZONA', 'DESCONECTADO');

-- AlterEnum
BEGIN;
CREATE TYPE "RolUsuario_new" AS ENUM ('SUPER_ADMIN', 'CLIENTE_ADMIN', 'CLIENTE_OPERADOR', 'PROVEEDOR_ADMIN', 'PROVEEDOR_OPERADOR');
ALTER TABLE "public"."usuarios" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "usuarios" ALTER COLUMN "rol" TYPE "RolUsuario_new" USING ("rol"::text::"RolUsuario_new");
ALTER TYPE "RolUsuario" RENAME TO "RolUsuario_old";
ALTER TYPE "RolUsuario_new" RENAME TO "RolUsuario";
DROP TYPE "public"."RolUsuario_old";
ALTER TABLE "usuarios" ALTER COLUMN "rol" SET DEFAULT 'CLIENTE_OPERADOR';
COMMIT;

-- AlterTable
ALTER TABLE "solicitudes_auxilio" ADD COLUMN     "vehiculoProveedorId" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "estadoDisponibilidad" "EstadoDisponibilidad" DEFAULT 'DESCONECTADO',
ADD COLUMN     "ultimaUbicacion" JSONB,
ALTER COLUMN "rol" SET DEFAULT 'CLIENTE_OPERADOR';

-- CreateTable
CREATE TABLE "vehiculos_proveedor" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "año" INTEGER NOT NULL,
    "tipo" "TipoVehiculoProveedor" NOT NULL,
    "capacidadKg" INTEGER,
    "estado" "EstadoVehiculo" NOT NULL DEFAULT 'ACTIVO',
    "proveedorId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehiculos_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_proveedor_patente_key" ON "vehiculos_proveedor"("patente");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_patente_idx" ON "vehiculos_proveedor"("patente");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_proveedorId_idx" ON "vehiculos_proveedor"("proveedorId");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_tipo_idx" ON "vehiculos_proveedor"("tipo");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_estado_idx" ON "vehiculos_proveedor"("estado");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_isActive_idx" ON "vehiculos_proveedor"("isActive");

-- CreateIndex
CREATE INDEX "vehiculos_proveedor_deletedAt_idx" ON "vehiculos_proveedor"("deletedAt");

-- CreateIndex
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateIndex
CREATE INDEX "usuarios_estadoDisponibilidad_idx" ON "usuarios"("estadoDisponibilidad");

-- AddForeignKey
ALTER TABLE "vehiculos_proveedor" ADD CONSTRAINT "vehiculos_proveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_vehiculoProveedorId_fkey" FOREIGN KEY ("vehiculoProveedorId") REFERENCES "vehiculos_proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
