-- Add per-property commission rate (nullable, falls back to user's global rate)
ALTER TABLE "Property" ADD COLUMN "commissionRate" DECIMAL(5,4);
