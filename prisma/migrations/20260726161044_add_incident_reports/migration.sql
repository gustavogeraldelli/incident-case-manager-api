-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timeline" TEXT,
    "impact" TEXT,
    "rootCause" TEXT,
    "resolution" TEXT,
    "lessonsLearned" TEXT,
    "preventiveActions" TEXT,
    "markdown" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
