-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "load" DOUBLE PRECISION,
    "voltage" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "temperature" DOUBLE PRECISION,
    "duration" INTEGER,
    "fuelConsumption" DOUBLE PRECISION,
    "noiseLevel" DOUBLE PRECISION,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConformityReport" (
    "id" TEXT NOT NULL,
    "isConform" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "phaseId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,

    CONSTRAINT "ConformityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_phaseId_key" ON "TestResult"("phaseId");

-- CreateIndex
CREATE UNIQUE INDEX "ConformityReport_phaseId_key" ON "ConformityReport"("phaseId");

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProductionPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConformityReport" ADD CONSTRAINT "ConformityReport_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProductionPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConformityReport" ADD CONSTRAINT "ConformityReport_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
