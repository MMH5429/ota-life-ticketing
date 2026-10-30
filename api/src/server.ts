import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from './lib/prisma.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(cors());
app.use(express.json());

function getUserIdHeader(req: express.Request): string | null {
  const userId = req.get('x-user-id');
  return typeof userId === 'string' && userId.trim().length > 0 ? userId.trim() : null;
}

type AuthResult =
  | { user: { id: string; name: string } }
  | { error: { status: number; message: string } };

async function getCurrentUser(req: express.Request): Promise<AuthResult> {
  const userId = getUserIdHeader(req);

  if (!userId) {
    return { error: { status: 401, message: 'Missing X-User-Id header.' } };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return { error: { status: 404, message: `User not found: ${userId}` } };
  }

  return { user: { id: user.id, name: user.name } };
}

async function ensureSeedData() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.createMany({
      data: [
        { id: 'user-1', name: 'Aiko' },
        { id: 'user-2', name: 'Kenji' },
        { id: 'user-3', name: 'Mika' },
      ],
    });
  }

  const eventCount = await prisma.event.count();
  if (eventCount === 0) {
    await prisma.event.createMany({
      data: [
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
      ],
    });
  }
}

function generateTicketCode() {
  return `OTA-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ota-life-api' });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'ota-life-api',
    message: 'Ota Life ticketing API is running.',
    endpoints: ['/health', '/events', '/events/:id/book', '/me/tickets', '/checkins'],
  });
});

app.get('/events', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { date: { gt: new Date() } },
      orderBy: { date: 'asc' },
    });

    const ticketCounts = await prisma.ticket.groupBy({
      by: ['eventId'],
      _count: { _all: true },
      where: { eventId: { in: events.map((event) => event.id) } },
    });
    const soldByEvent = new Map(ticketCounts.map(({ eventId, _count }) => [eventId, _count._all]));
    const items = events.map((event) => ({
      id: event.id,
      name: event.name,
      venue: event.venue,
      date: event.date.toISOString(),
      price: event.price,
      ticketsLeft: Math.max(event.totalTickets - (soldByEvent.get(event.id) ?? 0), 0),
    }));

    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch events.' });
  }
});

app.post('/events/:id/book', async (req, res) => {
  const { id } = req.params;
  const quantity = Number(req.body?.quantity ?? NaN);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
    return res.status(400).json({ message: 'Quantity must be an integer between 1 and 4.' });
  }

  const userResult = await getCurrentUser(req);
  if ('error' in userResult) {
    return res.status(userResult.error.status).json({ message: userResult.error.message });
  }

  const userId = userResult.user.id;

  try {
    const bookedTickets = await prisma.$transaction(async (tx) => {
      // Serialize bookings for this event before reading its sold ticket count.
      await tx.$queryRaw`SELECT id FROM Event WHERE id = ${id} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id } });
      if (!event) {
        throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
      }

      const eventTickets = await tx.ticket.count({ where: { eventId: id } });
      const remaining = event.totalTickets - eventTickets;

      if (quantity > remaining) {
        throw Object.assign(new Error(`Only ${remaining} ticket(s) left for this event.`), { statusCode: 409 });
      }

      const createdTickets: Array<{ code: string; eventId: string; userId: string }> = [];

      for (let index = 0; index < quantity; index += 1) {
        let code = generateTicketCode();
        let existing = await tx.ticket.findUnique({ where: { code } });

        while (existing) {
          code = generateTicketCode();
          existing = await tx.ticket.findUnique({ where: { code } });
        }

        createdTickets.push({ code, eventId: event.id, userId });
      }

      const created = await Promise.all(
        createdTickets.map((entry) =>
          tx.ticket.create({
            data: entry,
            include: { event: true },
          }),
        ),
      );

      return created;
    });

    return res.status(201).json({
      message: 'Tickets booked successfully.',
      tickets: bookedTickets.map((ticket) => ({
        id: ticket.id,
        code: ticket.code,
        eventId: ticket.eventId,
        eventName: ticket.event.name,
        checkedInAt: ticket.checkedInAt,
      })),
    });
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 500;
    const message = error?.message ?? 'Unable to book tickets.';
    return res.status(statusCode).json({ message });
  }
});

app.get('/me/tickets', async (req, res) => {
  const userResult = await getCurrentUser(req);
  if ('error' in userResult) {
    return res.status(userResult.error.status).json({ message: userResult.error.message });
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: userResult.user.id },
      include: { event: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      tickets.map((ticket) => ({
        id: ticket.id,
        code: ticket.code,
        checkedInAt: ticket.checkedInAt ? ticket.checkedInAt.toISOString() : null,
        event: {
          id: ticket.event.id,
          name: ticket.event.name,
          venue: ticket.event.venue,
          date: ticket.event.date.toISOString(),
          price: ticket.event.price,
        },
      })),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to fetch tickets.' });
  }
});

app.post('/checkins', async (req, res) => {
  const { code } = req.body ?? {};

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ message: 'A valid code is required.' });
  }

  try {
    const ticketCode = code.trim();
    const checkedInAt = new Date();
    const result = await prisma.ticket.updateMany({
      where: { code: ticketCode, checkedInAt: null },
      data: { checkedInAt },
    });

    if (result.count === 0) {
      const existing = await prisma.ticket.findUnique({
        where: { code: ticketCode },
        select: { checkedInAt: true },
      });
      if (!existing) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }
      return res.status(409).json({
        message: 'Ticket already checked in.',
        firstCheckedInAt: existing.checkedInAt?.toISOString(),
      });
    }

    const updated = await prisma.ticket.findUnique({
      where: { code: ticketCode },
      include: { event: true },
    });
    if (!updated) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    return res.status(200).json({
      message: 'Check-in successful.',
      ticket: {
        id: updated.id,
        code: updated.code,
        eventName: updated.event.name,
        checkedInAt: updated.checkedInAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Unable to check ticket in.' });
  }
});

async function start() {
  await ensureSeedData();
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API:', error);
  process.exit(1);
});
