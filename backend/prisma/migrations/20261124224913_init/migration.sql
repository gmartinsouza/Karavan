-- CreateEnum
CREATE TYPE "fuel_type" AS ENUM ('GASOLINE', 'ETHANOL', 'FLEX', 'DIESEL', 'CNG', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "maintenance_kind" AS ENUM ('PART', 'SERVICE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" SMALLINT NOT NULL,
    "plate" VARCHAR(7) NOT NULL,
    "fuel_type" "fuel_type" NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuelings" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "vehicle_id" UUID NOT NULL,
    "filled_at" TIMESTAMPTZ NOT NULL,
    "liters" DECIMAL(7,3) NOT NULL,
    "price_per_liter" DECIMAL(6,3) NOT NULL,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "station" TEXT,
    "full_tank" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuelings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "vehicle_id" UUID NOT NULL,
    "kind" "maintenance_kind" NOT NULL,
    "item" TEXT NOT NULL,
    "performed_at" TIMESTAMPTZ NOT NULL,
    "odometer_km" INTEGER NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "workshop" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_plans" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "vehicle_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "interval_km" INTEGER,
    "interval_months" SMALLINT,
    "last_done_at" TIMESTAMPTZ NOT NULL,
    "last_done_km" INTEGER NOT NULL,
    "last_alerted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "vehicles_user_id_id_idx" ON "vehicles"("user_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_user_id_plate_key" ON "vehicles"("user_id", "plate");

-- CreateIndex
CREATE INDEX "fuelings_vehicle_id_filled_at_id_idx" ON "fuelings"("vehicle_id", "filled_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "fuelings_vehicle_id_odometer_km_idx" ON "fuelings"("vehicle_id", "odometer_km");

-- CreateIndex
CREATE INDEX "maintenances_vehicle_id_performed_at_id_idx" ON "maintenances"("vehicle_id", "performed_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "review_plans_vehicle_id_idx" ON "review_plans"("vehicle_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuelings" ADD CONSTRAINT "fuelings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_plans" ADD CONSTRAINT "review_plans_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraints (escritas à mão: o Prisma não declara CHECK no schema)
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_year_range" CHECK ("year" BETWEEN 1900 AND 2100),
  ADD CONSTRAINT "vehicles_plate_format" CHECK ("plate" ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
  ADD CONSTRAINT "vehicles_odometer_non_negative" CHECK ("odometer_km" >= 0);

ALTER TABLE "fuelings"
  ADD CONSTRAINT "fuelings_liters_positive" CHECK ("liters" > 0),
  ADD CONSTRAINT "fuelings_price_positive" CHECK ("price_per_liter" > 0),
  ADD CONSTRAINT "fuelings_total_positive" CHECK ("total_cost" > 0),
  ADD CONSTRAINT "fuelings_odometer_non_negative" CHECK ("odometer_km" >= 0);

ALTER TABLE "maintenances"
  ADD CONSTRAINT "maintenances_cost_non_negative" CHECK ("cost" >= 0),
  ADD CONSTRAINT "maintenances_odometer_non_negative" CHECK ("odometer_km" >= 0);

ALTER TABLE "review_plans"
  ADD CONSTRAINT "review_plans_has_interval" CHECK ("interval_km" IS NOT NULL OR "interval_months" IS NOT NULL),
  ADD CONSTRAINT "review_plans_interval_km_positive" CHECK ("interval_km" IS NULL OR "interval_km" > 0),
  ADD CONSTRAINT "review_plans_interval_months_positive" CHECK ("interval_months" IS NULL OR "interval_months" > 0);
