-- CreateTable
CREATE TABLE "MachineAssignment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machineId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,

    CONSTRAINT "MachineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineQueueEntry" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "waitMinutes" INTEGER,
    "activeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machineId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "operatorId" TEXT,

    CONSTRAINT "MachineQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MachineAssignment_machineId_operatorId_key" ON "MachineAssignment"("machineId", "operatorId");

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineAssignment" ADD CONSTRAINT "MachineAssignment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineQueueEntry" ADD CONSTRAINT "MachineQueueEntry_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineQueueEntry" ADD CONSTRAINT "MachineQueueEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineQueueEntry" ADD CONSTRAINT "MachineQueueEntry_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProductionPhase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineQueueEntry" ADD CONSTRAINT "MachineQueueEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
