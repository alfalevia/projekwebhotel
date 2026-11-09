
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const globalForPrisma = globalThis;

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum dikonfigurasi. Hubungkan database PostgreSQL terlebih dahulu."
    );
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  globalForPrisma.prisma = prisma;

  return prisma;
}

const prisma = new Proxy(
  {},
  {
    get(_, property) {
      const client = getPrismaClient();
      const value = client[property];

      return typeof value === "function"
        ? value.bind(client)
        : value;
    },
  }
);

export default prisma;
