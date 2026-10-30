import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { id: 'user-1', name: 'Aiko' },
    { id: 'user-2', name: 'Kenji' },
    { id: 'user-3', name: 'Mika' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name },
      create: { id: user.id, name: user.name },
    });
  }

  const events = [
    {
      id: 'event-1',
      name: 'Ōta Tokyo Night Live',
      venue: 'Ōta City Hall',
      date: new Date('2026-11-15T19:00:00+09:00'),
      price: 3500,
      totalTickets: 2,
    },
    {
      id: 'event-2',
      name: 'Sunset Jazz Session',
      venue: 'Harajuku Hall',
      date: new Date('2026-11-20T18:30:00+09:00'),
      price: 4200,
      totalTickets: 12,
    },
    {
      id: 'event-3',
      name: 'Rooftop Cinema',
      venue: 'Shibuya Sky Deck',
      date: new Date('2026-11-28T20:00:00+09:00'),
      price: 2800,
      totalTickets: 15,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: {
        name: event.name,
        venue: event.venue,
        date: event.date,
        price: event.price,
        totalTickets: event.totalTickets,
      },
      create: {
        id: event.id,
        name: event.name,
        venue: event.venue,
        date: event.date,
        price: event.price,
        totalTickets: event.totalTickets,
      },
    });
  }

  console.log('Seeded users and events');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
