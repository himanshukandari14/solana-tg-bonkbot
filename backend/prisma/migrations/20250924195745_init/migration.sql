-- CreateTable
CREATE TABLE "public"."Users" (
    "id" TEXT NOT NULL,
    "credentialsId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_userId_key" ON "public"."Users"("userId");
