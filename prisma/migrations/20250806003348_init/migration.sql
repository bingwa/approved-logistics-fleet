-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'MANAGER', 'DRIVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."TruckStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('MAINTENANCE', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."ServiceCategory" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('NTSA_INSPECTION', 'INSURANCE', 'TGL_LICENSE', 'COMMERCIAL_LICENSE');

-- CreateEnum
CREATE TYPE "public"."ComplianceStatus" AS ENUM ('VALID', 'EXPIRING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('SPARES_REPORT', 'FLEET_OVERVIEW', 'OPERATIONAL_COSTS');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('GENERATING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'VIEWER',
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trucks" (
    "id" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "currentMileage" INTEGER NOT NULL,
    "status" "public"."TruckStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trucks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fuel_records" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "costPerLiter" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "route" TEXT,
    "odometerReading" INTEGER NOT NULL,
    "previousOdometer" INTEGER NOT NULL,
    "distanceCovered" INTEGER NOT NULL,
    "efficiencyKmpl" DOUBLE PRECISION NOT NULL,
    "attendantName" TEXT NOT NULL,
    "receiptNumber" TEXT,
    "receiptUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_records" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "serviceType" "public"."ServiceType" NOT NULL,
    "maintenanceCategory" "public"."ServiceCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorLocation" TEXT,
    "technicianName" TEXT,
    "mileageAtService" INTEGER,
    "nextServiceDue" TIMESTAMP(3),
    "routeTaken" TEXT,
    "receiptUrl" TEXT,
    "status" "public"."MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."spare_parts" (
    "id" TEXT NOT NULL,
    "maintenanceRecordId" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."compliance_documents" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "documentType" "public"."DocumentType" NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "issuingAuthority" TEXT NOT NULL,
    "documentUrl" TEXT,
    "daysToExpiry" INTEGER NOT NULL,
    "status" "public"."ComplianceStatus" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_generations" (
    "id" TEXT NOT NULL,
    "reportType" "public"."ReportType" NOT NULL,
    "truckId" TEXT,
    "parameters" JSONB NOT NULL,
    "fileUrl" TEXT,
    "fileSize" TEXT,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'GENERATING',
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "trucks_registration_key" ON "public"."trucks"("registration");

-- AddForeignKey
ALTER TABLE "public"."fuel_records" ADD CONSTRAINT "fuel_records_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fuel_records" ADD CONSTRAINT "fuel_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_records" ADD CONSTRAINT "maintenance_records_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_records" ADD CONSTRAINT "maintenance_records_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spare_parts" ADD CONSTRAINT "spare_parts_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "public"."maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spare_parts" ADD CONSTRAINT "spare_parts_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_documents" ADD CONSTRAINT "compliance_documents_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "public"."trucks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."compliance_documents" ADD CONSTRAINT "compliance_documents_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_generations" ADD CONSTRAINT "report_generations_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
