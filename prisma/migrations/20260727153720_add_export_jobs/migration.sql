-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "IncidentReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
