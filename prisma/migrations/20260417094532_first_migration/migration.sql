-- CreateEnum
CREATE TYPE "TemplateVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerAddress" TEXT NOT NULL,
    "ownerPublicKey" TEXT,
    "fabricJson" JSONB NOT NULL,
    "svgTemplate" TEXT NOT NULL,
    "svgBackground" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1200,
    "height" INTEGER NOT NULL DEFAULT 800,
    "fieldSchema" JSONB NOT NULL,
    "visibility" "TemplateVisibility" NOT NULL DEFAULT 'PRIVATE',
    "publishedTxid" TEXT,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "templateId" TEXT,
    "issuerAddress" TEXT NOT NULL,
    "issuerPubKey" TEXT,
    "recipientData" JSONB NOT NULL,
    "imageSha256" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL DEFAULT 'certificate/v2',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Template_ownerAddress_idx" ON "Template"("ownerAddress");

-- CreateIndex
CREATE INDEX "Template_visibility_idx" ON "Template"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_txid_key" ON "Certificate"("txid");

-- CreateIndex
CREATE INDEX "Certificate_issuerAddress_idx" ON "Certificate"("issuerAddress");

-- CreateIndex
CREATE INDEX "Certificate_templateId_idx" ON "Certificate"("templateId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
