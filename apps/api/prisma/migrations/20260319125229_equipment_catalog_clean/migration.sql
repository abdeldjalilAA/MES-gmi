/*
  Warnings:

  - You are about to drop the column `componentTypeId` on the `EngineComponent` table. All the data in the column will be lost.
  - You are about to drop the column `engineType` on the `ProductionOrder` table. All the data in the column will be lost.
  - You are about to drop the `ComponentType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `controlType` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enclosureType` to the `ProductionOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EnclosureType" AS ENUM ('STANDARD', 'INSONORISE');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('MANUEL', 'AUTO', 'INVERSEUR_SEPARE');

-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('MOTEUR', 'ALTERNATEUR', 'ATS', 'BATTERIE', 'CARTE_COMMANDE', 'CHARGEUR');

-- DropForeignKey
ALTER TABLE "EngineComponent" DROP CONSTRAINT "EngineComponent_componentTypeId_fkey";

-- AlterTable
ALTER TABLE "EngineComponent" DROP COLUMN "componentTypeId",
ADD COLUMN     "equipmentModelId" TEXT;

-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "engineType",
ADD COLUMN     "controlType" "ControlType" NOT NULL,
ADD COLUMN     "enclosureType" "EnclosureType" NOT NULL;

-- DropTable
DROP TABLE "ComponentType";

-- DropEnum
DROP TYPE "EngineType";

-- CreateTable
CREATE TABLE "EquipmentBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minKva" DOUBLE PRECISION,
    "maxKva" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brandId" TEXT NOT NULL,

    CONSTRAINT "EquipmentModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentBrand_name_category_key" ON "EquipmentBrand"("name", "category");

-- AddForeignKey
ALTER TABLE "EquipmentModel" ADD CONSTRAINT "EquipmentModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "EquipmentBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineComponent" ADD CONSTRAINT "EngineComponent_equipmentModelId_fkey" FOREIGN KEY ("equipmentModelId") REFERENCES "EquipmentModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
