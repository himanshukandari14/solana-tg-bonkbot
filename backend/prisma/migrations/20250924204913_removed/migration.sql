/*
  Warnings:

  - You are about to drop the column `credentialsId` on the `Users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Users" DROP COLUMN "credentialsId";
