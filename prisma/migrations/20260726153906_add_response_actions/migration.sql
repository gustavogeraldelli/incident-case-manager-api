-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('INVESTIGATION', 'CONTAINMENT', 'MITIGATION', 'COMMUNICATION', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateTable
CREATE TABLE "ResponseAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'TODO',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponseAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ResponseAction" ADD CONSTRAINT "ResponseAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseAction" ADD CONSTRAINT "ResponseAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseAction" ADD CONSTRAINT "ResponseAction_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
