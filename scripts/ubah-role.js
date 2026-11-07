import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.update({
    where: {
      email: "haloalfa172@gmail.com",
    },
    data: {
      role: "HOUSEKEEPING",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("Role akun berhasil diperbarui:");
  console.table([user]);
} catch (error) {
  console.error("Gagal mengubah role:", error.message);
} finally {
  await prisma.$disconnect();
}
