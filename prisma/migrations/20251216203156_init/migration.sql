-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PROVIDER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "TipoVehiculo" AS ENUM ('AUTO', 'CAMIONETA', 'CAMION', 'MOTO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoVehiculo" AS ENUM ('ACTIVO', 'MANTENIMIENTO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "TipoAuxilio" AS ENUM ('MECANICO', 'GRUA', 'BATERIA', 'COMBUSTIBLE', 'CAMBIO_RUEDA', 'CERRAJERIA', 'OTROS');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'ASIGNADO', 'EN_CAMINO', 'EN_SERVICIO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "empresaId" TEXT,
    "proveedorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "serviciosIncluidos" TEXT[],
    "precioMensual" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehiculos" (
    "id" TEXT NOT NULL,
    "patente" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "año" INTEGER NOT NULL,
    "tipo" "TipoVehiculo" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "estado" "EstadoVehiculo" NOT NULL DEFAULT 'ACTIVO',
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "cuit" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "serviciosOfrecidos" TEXT[],
    "zonasCobertura" JSONB,
    "calificacionPromedio" DECIMAL(3,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_auxilio" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "TipoAuxilio" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "latitud" DECIMAL(10,8) NOT NULL,
    "longitud" DECIMAL(11,8) NOT NULL,
    "direccion" TEXT NOT NULL,
    "observaciones" TEXT,
    "fotos" TEXT[],
    "costoEstimado" DECIMAL(10,2),
    "costoFinal" DECIMAL(10,2),
    "calificacion" INTEGER,
    "comentarioCliente" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAsignacion" TIMESTAMP(3),
    "fechaInicio" TIMESTAMP(3),
    "fechaFinalizacion" TIMESTAMP(3),
    "fechaCancelacion" TIMESTAMP(3),
    "motivoCancelacion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "empresaId" TEXT NOT NULL,
    "vehiculoId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "solicitadoPorId" TEXT NOT NULL,
    "atendidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_auxilio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_idx" ON "usuarios"("empresaId");

-- CreateIndex
CREATE INDEX "usuarios_proveedorId_idx" ON "usuarios"("proveedorId");

-- CreateIndex
CREATE INDEX "usuarios_isActive_idx" ON "usuarios"("isActive");

-- CreateIndex
CREATE INDEX "usuarios_deletedAt_idx" ON "usuarios"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuarioId_idx" ON "refresh_tokens"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cuit_key" ON "empresas"("cuit");

-- CreateIndex
CREATE INDEX "empresas_cuit_idx" ON "empresas"("cuit");

-- CreateIndex
CREATE INDEX "empresas_planId_idx" ON "empresas"("planId");

-- CreateIndex
CREATE INDEX "empresas_isActive_idx" ON "empresas"("isActive");

-- CreateIndex
CREATE INDEX "empresas_deletedAt_idx" ON "empresas"("deletedAt");

-- CreateIndex
CREATE INDEX "planes_isActive_idx" ON "planes"("isActive");

-- CreateIndex
CREATE INDEX "planes_deletedAt_idx" ON "planes"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehiculos_patente_key" ON "vehiculos"("patente");

-- CreateIndex
CREATE INDEX "vehiculos_patente_idx" ON "vehiculos"("patente");

-- CreateIndex
CREATE INDEX "vehiculos_empresaId_idx" ON "vehiculos"("empresaId");

-- CreateIndex
CREATE INDEX "vehiculos_isActive_idx" ON "vehiculos"("isActive");

-- CreateIndex
CREATE INDEX "vehiculos_deletedAt_idx" ON "vehiculos"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_cuit_key" ON "proveedores"("cuit");

-- CreateIndex
CREATE INDEX "proveedores_cuit_idx" ON "proveedores"("cuit");

-- CreateIndex
CREATE INDEX "proveedores_isActive_idx" ON "proveedores"("isActive");

-- CreateIndex
CREATE INDEX "proveedores_deletedAt_idx" ON "proveedores"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "solicitudes_auxilio_numero_key" ON "solicitudes_auxilio"("numero");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_numero_idx" ON "solicitudes_auxilio"("numero");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_estado_idx" ON "solicitudes_auxilio"("estado");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_empresaId_idx" ON "solicitudes_auxilio"("empresaId");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_vehiculoId_idx" ON "solicitudes_auxilio"("vehiculoId");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_proveedorId_idx" ON "solicitudes_auxilio"("proveedorId");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_fechaSolicitud_idx" ON "solicitudes_auxilio"("fechaSolicitud");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_isActive_idx" ON "solicitudes_auxilio"("isActive");

-- CreateIndex
CREATE INDEX "solicitudes_auxilio_deletedAt_idx" ON "solicitudes_auxilio"("deletedAt");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_vehiculoId_fkey" FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_auxilio" ADD CONSTRAINT "solicitudes_auxilio_atendidoPorId_fkey" FOREIGN KEY ("atendidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
