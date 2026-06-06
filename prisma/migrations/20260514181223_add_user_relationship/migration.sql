-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "noShowCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "clientAId" TEXT NOT NULL,
    "clientBId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_clientAId_clientBId_key" ON "Relationship"("clientAId", "clientBId");

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_clientAId_fkey" FOREIGN KEY ("clientAId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_clientBId_fkey" FOREIGN KEY ("clientBId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
