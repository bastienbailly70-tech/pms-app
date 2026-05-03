-- Add commissionRate to User (default 15%)
ALTER TABLE "User" ADD COLUMN "commissionRate" DECIMAL(5,4) NOT NULL DEFAULT 0.1500;
