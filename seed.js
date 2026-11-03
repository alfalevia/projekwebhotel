
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL tidak ditemukan. Periksa file .env.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Memasukkan data awal hotel...");

  const roomTypes = [
    {
      name: "Standard Room",
      description: "Kamar nyaman untuk kebutuhan menginap sehari-hari.",
      capacity: 2,
      price: 350000,
    },
    {
      name: "Deluxe Room",
      description: "Kamar lebih luas dengan suasana hangat dan elegan.",
      capacity: 2,
      price: 550000,
    },
    {
      name: "Suite Room",
      description: "Kamar premium untuk pengalaman menginap istimewa.",
      capacity: 3,
      price: 850000,
    },
  ];

  const createdRoomTypes = [];

  for (const data of roomTypes) {
    let roomType = await prisma.roomType.findFirst({
      where: { name: data.name },
    });

    if (!roomType) {
      roomType = await prisma.roomType.create({
        data,
      });
    }

    createdRoomTypes.push(roomType);
    console.log(`Tipe kamar tersedia: ${roomType.name}`);
  }

  const [standard, deluxe, suite] = createdRoomTypes;

  const rooms = [
    { roomNumber: "101", floor: 1, roomTypeId: standard.id },
    { roomNumber: "102", floor: 1, roomTypeId: standard.id },
    { roomNumber: "201", floor: 2, roomTypeId: deluxe.id },
    { roomNumber: "202", floor: 2, roomTypeId: deluxe.id },
    { roomNumber: "301", floor: 3, roomTypeId: suite.id },
  ];

  for (const data of rooms) {
    const existingRoom = await prisma.room.findUnique({
      where: { roomNumber: data.roomNumber },
    });

    if (!existingRoom) {
      await prisma.room.create({ data });
      console.log(`Kamar ${data.roomNumber} berhasil dibuat.`);
    } else {
      console.log(`Kamar ${data.roomNumber} sudah tersedia.`);
    }
  }

  console.log("--------------------------------");
  console.log("Data awal hotel selesai diproses.");
  console.log("Jumlah tipe kamar:", await prisma.roomType.count());
  console.log("Jumlah kamar:", await prisma.room.count());
  console.log("--------------------------------");
}

main()
  .catch((error) => {
    console.error("Gagal memasukkan data awal hotel.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
