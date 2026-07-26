-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('API', 'WEB_APP', 'MOBILE_APP', 'DATABASE', 'QUEUE', 'INFRASTRUCTURE', 'THIRD_PARTY', 'OTHER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SystemType" NOT NULL,
    "environment" "Environment" NOT NULL,
    "ownerTeam" TEXT,
    "description" TEXT,
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "System_organizationId_name_environment_key" ON "System"("organizationId", "name", "environment");

-- AddForeignKey
ALTER TABLE "System" ADD CONSTRAINT "System_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
