/**
 * Phase 5 Tests — Socket.IO Real-Time Queue Updates
 *
 * Tests verify:
 * 1.  Socket server initialises successfully
 * 2.  Authenticated customer can connect
 * 3.  Unauthenticated socket connection is rejected
 * 4.  Staff socket authentication works
 * 5.  Unauthorized room access is rejected
 * 6.  Customer can join the service room for their active token
 * 7.  Staff can join their assigned service room
 * 8.  WAITING → CALLED emits queue:updated
 * 9.  CALLED  → SERVING emits queue:updated
 * 10. SERVING → COMPLETED emits queue:updated
 * 11. WAITING/CALLED → SKIPPED emits queue:updated
 * 12. Customer cancellation emits queue:updated
 * 13. Failed DB operations do not emit
 * 14. Event payload does not expose sensitive fields
 * 15. Existing Phase 1 tests pass (covered by auth.test.ts)
 * 16. Existing Phase 2 tests pass (covered by phase2.test.ts)
 * 17. Existing Phase 3 tests pass (covered by phase3.test.ts)
 * 18. Existing Phase 4 tests pass (covered by phase4.test.ts)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { initSocketServer, closeSocketServer } from '../socket/socketServer';
import { SOCKET_EVENTS } from '../socket/socketEvents';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { QueueToken } from '../models/QueueToken';
import { QueueSequence } from '../models/QueueSequence';
import { generateAccessToken } from '../utils/token';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TEST_PORT = 5099;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

let httpServer: http.Server;
let customerToken: string;
let staffToken: string;
let customerUserId: string;
let staffUserId: string;
let orgId: string;
let serviceId: string;
let counterId: string;
let activeQueueTokenId: string;

/** Connect a socket.io client and wait for connect/error */
function connectClient(authToken: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ClientIO(SERVER_URL, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
    // Timeout guard
    setTimeout(() => reject(new Error('Socket connect timeout')), 5000);
  });
}

/** Join a room and wait for room:joined or error */
function joinRoom(socket: ClientSocket, svcId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('room:joined', () => resolve());
    socket.once('error', (err: any) => reject(new Error(err?.message || 'room error')));
    socket.emit(SOCKET_EVENTS.JOIN_SERVICE_ROOM, svcId);
    setTimeout(() => reject(new Error('Join room timeout')), 5000);
  });
}

/** Listen for exactly one queue:updated event */
function waitForQueueUpdate(socket: ClientSocket, timeoutMs = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('queue:updated timeout')), timeoutMs);
    socket.once(SOCKET_EVENTS.QUEUE_UPDATED, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/queueless_test';
  await mongoose.connect(MONGO_URI);

  // Clean phase-5 test collections
  await User.deleteMany({ email: /phase5test/ });
  await Organization.deleteMany({ name: /Phase5/ });
  await Service.deleteMany({ name: /Phase5/ });
  await Counter.deleteMany({ name: /Phase5/ });
  await QueueToken.deleteMany({ tokenCode: /P5/ });
  await QueueSequence.deleteMany({});

  // ── Seed customer ──────────────────────────────────────────────────────────
  const customer = await User.create({
    fullName: 'Phase5 Customer',
    email: 'phase5test.customer@test.com',
    phone: '0000000005',
    passwordHash: 'hashed',
    role: 'customer',
    isActive: true,
  });
  customerUserId = customer._id.toString();
  customerToken = generateAccessToken({ userId: customerUserId, role: 'customer' });

  // ── Seed org ───────────────────────────────────────────────────────────────
  const org = await Organization.create({
    name: 'Phase5 Org',
    category: 'Testing',
    address: '1 Test St',
    phone: '0000000000',
    email: 'phase5@org.com',
    ownerId: customer._id,
    isActive: true,
  });
  orgId = org._id.toString();

  // ── Seed service ───────────────────────────────────────────────────────────
  const service = await Service.create({
    name: 'Phase5 Service',
    organizationId: org._id,
    estimatedServiceTime: 10,
    isActive: true,
  });
  serviceId = service._id.toString();

  // ── Seed staff ─────────────────────────────────────────────────────────────
  // Counter first so we can link it to staff
  const counter = await Counter.create({
    name: 'Phase5 Counter',
    organizationId: org._id,
    serviceId: service._id,
    isActive: true,
  });
  counterId = counter._id.toString();

  const staff = await User.create({
    fullName: 'Phase5 Staff',
    email: 'phase5test.staff@test.com',
    phone: '0000000006',
    passwordHash: 'hashed',
    role: 'staff',
    organizationId: org._id,
    counterId: counter._id,
    isActive: true,
  });
  staffUserId = staff._id.toString();
  staffToken = generateAccessToken({ userId: staffUserId, role: 'staff' });

  // ── Seed an active queue token for the customer ────────────────────────────
  const qt = await QueueToken.create({
    organizationId: org._id,
    serviceId: service._id,
    customerId: customer._id,
    tokenNumber: 1,
    tokenCode: 'P5001',
    queueDate: new Date().toISOString().slice(0, 10),
    status: 'WAITING',
    joinedAt: new Date(),
    estimatedWaitMinutes: 0,
  });
  activeQueueTokenId = qt._id.toString();

  // ── Start HTTP + Socket.IO server ──────────────────────────────────────────
  httpServer = http.createServer(app);
  initSocketServer(httpServer);
  await new Promise<void>((res) => httpServer.listen(TEST_PORT, res));
});

afterAll(async () => {
  await User.deleteMany({ email: /phase5test/ });
  await Organization.deleteMany({ name: /Phase5/ });
  await Service.deleteMany({ name: /Phase5/ });
  await Counter.deleteMany({ name: /Phase5/ });
  await QueueToken.deleteMany({ tokenCode: /P5/ });
  await QueueSequence.deleteMany({});
  await closeSocketServer();
  if (httpServer && httpServer.listening) {
    await new Promise<void>((res) => httpServer.close(() => res()));
  }
  await mongoose.disconnect();
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Phase 5 — Socket.IO Real-Time Queue Updates', () => {

  // ── 1. Server initialises ──────────────────────────────────────────────────
  it('1. Socket server initialises and health endpoint still works', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ── 2. Authenticated customer can connect ──────────────────────────────────
  it('2. Authenticated customer can connect', async () => {
    const socket = await connectClient(customerToken);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  // ── 3. Unauthenticated connection is rejected ──────────────────────────────
  it('3. Unauthenticated socket connection is rejected', async () => {
    await expect(connectClient('invalid.jwt.token')).rejects.toThrow();
  });

  // ── 4. Staff can connect ───────────────────────────────────────────────────
  it('4. Authenticated staff can connect', async () => {
    const socket = await connectClient(staffToken);
    expect(socket.connected).toBe(true);
    socket.disconnect();
  });

  // ── 5. Unauthorized room access ────────────────────────────────────────────
  it('5. Customer cannot join arbitrary service room (no active token there)', async () => {
    const socket = await connectClient(customerToken);
    const fakeServiceId = new mongoose.Types.ObjectId().toString();

    await expect(joinRoom(socket, fakeServiceId)).rejects.toThrow(/Not authorised/);
    socket.disconnect();
  });

  // ── 6. Customer can join their active token's service room ─────────────────
  it('6. Customer can join service room for their active token', async () => {
    const socket = await connectClient(customerToken);
    await expect(joinRoom(socket, serviceId)).resolves.toBeUndefined();
    socket.disconnect();
  });

  // ── 7. Staff can join their assigned service room ──────────────────────────
  it('7. Staff can join their assigned service room', async () => {
    const socket = await connectClient(staffToken);
    await expect(joinRoom(socket, serviceId)).resolves.toBeUndefined();
    socket.disconnect();
  });

  // ── 8. call-next emits TOKEN_CALLED ───────────────────────────────────────
  it('8. WAITING → CALLED emits queue:updated with TOKEN_CALLED', async () => {
    const listener = await connectClient(customerToken);
    await joinRoom(listener, serviceId);

    const updatePromise = waitForQueueUpdate(listener);

    // Re-seed a WAITING token for staff to call
    const qt = await QueueToken.create({
      organizationId: orgId,
      serviceId,
      customerId: customerUserId,
      tokenNumber: 2,
      tokenCode: 'P5002',
      queueDate: new Date().toISOString().slice(0, 10),
      status: 'WAITING',
      joinedAt: new Date(),
      estimatedWaitMinutes: 0,
    });

    const res = await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;
    expect(payload.eventType).toBe('TOKEN_CALLED');
    expect(payload.serviceId).toBe(serviceId);
    expect(payload.status).toBe('CALLED');

    listener.disconnect();
  });

  // ── 9. start emits TOKEN_SERVING ──────────────────────────────────────────
  it('9. CALLED → SERVING emits queue:updated with TOKEN_SERVING', async () => {
    // Find the CALLED token
    const calledToken = await QueueToken.findOne({ serviceId, status: 'CALLED' });
    expect(calledToken).toBeTruthy();

    const listener = await connectClient(customerToken);
    await joinRoom(listener, serviceId);
    const updatePromise = waitForQueueUpdate(listener);

    const res = await request(app)
      .post(`/api/staff/queue/${calledToken!._id}/start`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;
    expect(payload.eventType).toBe('TOKEN_SERVING');
    expect(payload.status).toBe('SERVING');

    listener.disconnect();
  });

  // ── 10. complete emits TOKEN_COMPLETED ────────────────────────────────────
  it('10. SERVING → COMPLETED emits queue:updated with TOKEN_COMPLETED', async () => {
    const servingToken = await QueueToken.findOne({ serviceId, status: 'SERVING' });
    expect(servingToken).toBeTruthy();

    const listener = await connectClient(customerToken);
    await joinRoom(listener, serviceId);
    const updatePromise = waitForQueueUpdate(listener);

    const res = await request(app)
      .post(`/api/staff/queue/${servingToken!._id}/complete`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;
    expect(payload.eventType).toBe('TOKEN_COMPLETED');
    expect(payload.status).toBe('COMPLETED');

    listener.disconnect();
  });

  // ── 11. skip emits TOKEN_SKIPPED ──────────────────────────────────────────
  it('11. WAITING → SKIPPED emits queue:updated with TOKEN_SKIPPED', async () => {
    // Create a fresh WAITING token to skip
    const qt = await QueueToken.create({
      organizationId: orgId,
      serviceId,
      customerId: customerUserId,
      tokenNumber: 99,
      tokenCode: 'P5099',
      queueDate: new Date().toISOString().slice(0, 10),
      status: 'WAITING',
      joinedAt: new Date(),
      estimatedWaitMinutes: 0,
    });

    const listener = await connectClient(customerToken);
    await joinRoom(listener, serviceId);
    const updatePromise = waitForQueueUpdate(listener);

    const res = await request(app)
      .post(`/api/staff/queue/${qt._id}/skip`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;
    expect(payload.eventType).toBe('TOKEN_SKIPPED');
    expect(payload.status).toBe('SKIPPED');

    listener.disconnect();
  });

  // ── 12. cancel emits TOKEN_CANCELLED ──────────────────────────────────────
  it('12. Customer cancellation emits queue:updated with TOKEN_CANCELLED', async () => {
    // Create a WAITING token for the customer to cancel
    const qt = await QueueToken.create({
      organizationId: orgId,
      serviceId,
      customerId: customerUserId,
      tokenNumber: 50,
      tokenCode: 'P5050',
      queueDate: new Date().toISOString().slice(0, 10),
      status: 'WAITING',
      joinedAt: new Date(),
      estimatedWaitMinutes: 0,
    });

    const listener = await connectClient(staffToken);
    await joinRoom(listener, serviceId);
    const updatePromise = waitForQueueUpdate(listener);

    const res = await request(app)
      .post(`/api/queues/${qt._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;
    expect(payload.eventType).toBe('TOKEN_CANCELLED');
    expect(payload.status).toBe('CANCELLED');

    listener.disconnect();
  });

  // ── 13. Failed operations don't emit ──────────────────────────────────────
  it('13. Failed queue operations do not emit socket events', async () => {
    const listener = await connectClient(customerToken);
    await joinRoom(listener, serviceId);

    let emitted = false;
    listener.on(SOCKET_EVENTS.QUEUE_UPDATED, () => { emitted = true; });

    // Clear all WAITING tokens so call-next returns 404
    await QueueToken.deleteMany({ serviceId, status: 'WAITING' });

    const res = await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(404); // no waiting tokens

    // Wait a moment to confirm no event arrives
    await new Promise(r => setTimeout(r, 500));
    expect(emitted).toBe(false);

    listener.disconnect();
  });

  // ── 14. Payload doesn't expose sensitive fields ────────────────────────────
  it('14. queue:updated payload does not expose sensitive fields', async () => {
    const qt = await QueueToken.create({
      organizationId: orgId,
      serviceId,
      customerId: customerUserId,
      tokenNumber: 77,
      tokenCode: 'P5077',
      queueDate: new Date().toISOString().slice(0, 10),
      status: 'WAITING',
      joinedAt: new Date(),
      estimatedWaitMinutes: 0,
    });

    const listener = await connectClient(staffToken);
    await joinRoom(listener, serviceId);
    const updatePromise = waitForQueueUpdate(listener);

    const res = await request(app)
      .post(`/api/queues/${qt._id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    const payload = await updatePromise;

    // Must NOT contain sensitive fields
    expect(payload).not.toHaveProperty('passwordHash');
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('accessToken');
    expect(payload).not.toHaveProperty('refreshToken');

    // Must contain expected fields
    expect(payload).toHaveProperty('serviceId');
    expect(payload).toHaveProperty('tokenCode');
    expect(payload).toHaveProperty('eventType');
    expect(payload).toHaveProperty('status');
    expect(payload).toHaveProperty('timestamp');

    listener.disconnect();
  });
});
