-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" BIGINT NOT NULL DEFAULT 0,
    "updated_at" BIGINT NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" BIGINT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'task',
    "order_index" REAL NOT NULL DEFAULT 0,
    "due_date" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "category" TEXT,
    "series_id" TEXT,
    "created_at" BIGINT NOT NULL DEFAULT 0,
    "updated_at" BIGINT NOT NULL DEFAULT 0,
    "deleted_at" BIGINT,
    CONSTRAINT "list_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "list_items_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "recurring_series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurring_series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "weekdays_mask" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "start_time" TEXT,
    "end_time" TEXT,
    "paused_at" BIGINT,
    "created_at" BIGINT NOT NULL DEFAULT 0,
    "updated_at" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "recurring_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "list_items_user_id_order_index_idx" ON "list_items"("user_id", "order_index");

-- CreateIndex
CREATE INDEX "list_items_user_id_deleted_at_idx" ON "list_items"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "list_items_user_id_due_date_idx" ON "list_items"("user_id", "due_date");

-- CreateIndex
CREATE INDEX "list_items_user_id_completed_at_idx" ON "list_items"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "list_items_series_id_due_date_idx" ON "list_items"("series_id", "due_date");

-- CreateIndex
CREATE INDEX "list_items_deleted_at_idx" ON "list_items"("deleted_at");

-- CreateIndex
CREATE INDEX "recurring_series_user_id_paused_at_idx" ON "recurring_series"("user_id", "paused_at");

-- CreateIndex
CREATE INDEX "recurring_series_user_id_updated_at_idx" ON "recurring_series"("user_id", "updated_at");

-- Backfill completed_at for upgraded datasets when rows already exist.
UPDATE "list_items"
SET "completed_at" = "updated_at"
WHERE "completed" = 1
  AND "completed_at" IS NULL;
