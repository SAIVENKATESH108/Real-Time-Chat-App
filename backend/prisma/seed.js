import bcrypt from 'bcryptjs';
import prisma from '../src/config/db.js';

async function main() {
  console.log('🌱 Starting database seed for chatO...');

  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@demo.com' },
    update: {},
    create: {
      email: 'alice@demo.com',
      displayName: 'Alice Cooper',
      passwordHash,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@demo.com' },
    update: {},
    create: {
      email: 'bob@demo.com',
      displayName: 'Bob Martin',
      passwordHash,
    },
  });

  console.log(`✅ Seeded users: ${alice.displayName}, ${bob.displayName}`);

  // Create default rooms
  const generalRoom = await prisma.room.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      isPrivate: false,
      createdBy: alice.id,
    },
  });

  const techRoom = await prisma.room.upsert({
    where: { name: 'engineering' },
    update: {},
    create: {
      name: 'engineering',
      isPrivate: false,
      createdBy: bob.id,
    },
  });

  console.log(`✅ Seeded rooms: #${generalRoom.name}, #${techRoom.name}`);

  // Add memberships
  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: alice.id, roomId: generalRoom.id } },
    update: {},
    create: { userId: alice.id, roomId: generalRoom.id },
  });

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: bob.id, roomId: generalRoom.id } },
    update: {},
    create: { userId: bob.id, roomId: generalRoom.id },
  });

  // Seed sample welcome message
  const existingMsg = await prisma.message.findFirst({
    where: { roomId: generalRoom.id },
  });

  if (!existingMsg) {
    await prisma.message.create({
      data: {
        roomId: generalRoom.id,
        userId: alice.id,
        content: 'Welcome to chatO! 🚀 Feel free to send a message, create new channels, or test real-time chat across devices.',
      },
    });
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
