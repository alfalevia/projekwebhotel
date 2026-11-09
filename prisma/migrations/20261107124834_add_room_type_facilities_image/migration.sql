-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageUrl" TEXT;
