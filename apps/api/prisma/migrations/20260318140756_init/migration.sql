-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'COMMERCIAL_AGENT', 'PROCUREMENT_AGENT', 'PHASE_SUPERVISOR', 'OPERATOR', 'QC_DELIVERY_AGENT');

-- CreateEnum
CREATE TYPE "EngineType" AS ENUM ('STANDARD', 'INSONORISE', 'AUTO');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PRODUCTION', 'TESTING', 'QC', 'DELIVERED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('OPERATIONAL', 'EN_PANNE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerialConfig" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "separator" TEXT NOT NULL DEFAULT '-',
    "includeYear" BOOLEAN NOT NULL DEFAULT true,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "lastYear" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerialConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComponentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComponentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "qrCode" TEXT,
    "engineType" "EngineType" NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "requirements" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineComponent" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,
    "componentTypeId" TEXT NOT NULL,

    CONSTRAINT "EngineComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "minOperators" INTEGER NOT NULL DEFAULT 1,
    "maxOperators" INTEGER NOT NULL DEFAULT 2,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPhase" (
    "id" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "status" "PhaseStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "delayMinutes" INTEGER,
    "orderId" TEXT NOT NULL,
    "supervisorId" TEXT,

    CONSTRAINT "ProductionPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhaseEntry" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "machineId" TEXT,

    CONSTRAINT "PhaseEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warranty" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "conditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Warranty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentType_name_key" ON "ComponentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_serialNumber_key" ON "ProductionOrder"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPhase_orderId_phaseNumber_key" ON "ProductionPhase"("orderId", "phaseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Warranty_orderId_key" ON "Warranty"("orderId");

-- AddForeignKey
ALTER TABLE "EngineComponent" ADD CONSTRAINT "EngineComponent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineComponent" ADD CONSTRAINT "EngineComponent_componentTypeId_fkey" FOREIGN KEY ("componentTypeId") REFERENCES "ComponentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPhase" ADD CONSTRAINT "ProductionPhase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPhase" ADD CONSTRAINT "ProductionPhase_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEntry" ADD CONSTRAINT "PhaseEntry_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProductionPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEntry" ADD CONSTRAINT "PhaseEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseEntry" ADD CONSTRAINT "PhaseEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warranty" ADD CONSTRAINT "Warranty_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
