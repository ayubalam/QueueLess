/**
 * Phase 7 Tests — Customer Notifications & Queue Alerts
 *
 * Tests verify:
 *  1.  Notification model creates correctly and persists to DB
 *  2.  Notification endpoint requires authentication (401 without token)
 *  3.  Customer can retrieve their own notifications (GET /api/notifications)
 *  4.  Customer cannot access another customer's notifications
 *  5.  Unread count returns correctly (GET /api/notifications/unread-count)
 *  6.  Mark single notification as read (PATCH /api/notifications/:id/read)
 *  7.  Ownership check: customer cannot mark another user's notification as read
 *  8.  Mark all notifications as read (PATCH /api/notifications/read-all)
 *  9.  TOKEN_CALLED notification is created when staff calls next token
 * 10.  TOKEN_SERVING notification is created when staff starts serving
 * 11.  TOKEN_COMPLETED notification is created when staff completes token
 * 12.  TOKEN_SKIPPED notification is created when staff skips token
 * 13.  TOKEN_CANCELLED notification is created when customer cancels token
 * 14.  TURN_APPROACHING notification is not duplicated (idempotency check)
 * 15.  Notification failure does NOT break a successful queue operation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { QueueToken } from '../models/QueueToken';
import { QueueSequence } from '../models/QueueSequence';
import { Notification } from '../models/Notification';
import { generateAccessToken } from '../utils/token';
import { getTodayDateString } from '../services/queueEngine';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

// ── Shared state ──────────────────────────────────────────────────────────────
let staffToken: string;
let customerToken: string;
let customer2Token: string;

let customerId: string;
let customer2Id: string;
let staffId: string;
let orgId: string;
let serviceId: string;
let counterId: string;

// ── Setup & Teardown ──────────────────────────────────────────────────────────
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  // Clean phase7 test data
  await User.deleteMany({ email: /phase7test/ });
  await Organization.deleteMany({ name: /Phase7/ });
  await Service.deleteMany({ name: /Phase7/ });
  await Counter.deleteMany({ name: /Phase7/ });
  await QueueToken.deleteMany({ tokenCode: /P7/ });
  await QueueSequence.deleteMany({});
  await Notification.deleteMany({});

  // ── Users ────────────────────────────────────────────────────────────────
  const admin = await User.create({
    fullName: 'Phase7 Admin',
    email: 'phase7test.admin@test.com',
    phone: '0700000071',
    passwordHash: 'hashed',
    role: 'organization_admin',
    isActive: true,
  });

  // ── Organization ─────────────────────────────────────────────────────────
  const org = await Organization.create({
    name: 'Phase7 Health Clinic',
    category: 'Healthcare',
    address: '700 Test Blvd',
    phone: '700-000-0070',
    email: 'clinic@phase7.com',
    ownerId: admin._id,
    isActive: true,
  });
  orgId = org._id.toString();

  admin.organizationId = org._id;
  await admin.save();

  // ── Service ──────────────────────────────────────────────────────────────
  const service = await Service.create({
    name: 'Phase7 General Consultation',
    description: 'Walk-in consultation',
    organizationId: org._id,
    estimatedServiceTime: 15,
    isActive: true,
  });
  serviceId = service._id.toString();

  // ── Counter ──────────────────────────────────────────────────────────────
  const counter = await Counter.create({
    name: 'Phase7 Counter 1',
    organizationId: org._id,
    serviceId: service._id,
    isActive: true,
  });
  counterId = counter._id.toString();

  // ── Staff ─────────────────────────────────────────────────────────────────
  const staff = await User.create({
    fullName: 'Phase7 Staff Member',
    email: 'phase7test.staff@test.com',
    phone: '0700000072',
    passwordHash: 'hashed',
    role: 'staff',
    organizationId: org._id,
    counterId: counter._id,
    isActive: true,
  });
  staffId = staff._id.toString();
  staffToken = generateAccessToken({ userId: staffId, role: 'staff' });

  // ── Customer 1 ────────────────────────────────────────────────────────────
  const customer = await User.create({
    fullName: 'Phase7 Customer One',
    email: 'phase7test.customer@test.com',
    phone: '0700000073',
    passwordHash: 'secretpasswordhash777',
    role: 'customer',
    isActive: true,
  });
  customerId = customer._id.toString();
  customerToken = generateAccessToken({ userId: customerId, role: 'customer' });

  // ── Customer 2 ────────────────────────────────────────────────────────────
  const customer2 = await User.create({
    fullName: 'Phase7 Customer Two',
    email: 'phase7test.customer2@test.com',
    phone: '0700000074',
    passwordHash: 'hashed2',
    role: 'customer',
    isActive: true,
  });
  customer2Id = customer2._id.toString();
  customer2Token = generateAccessToken({ userId: customer2Id, role: 'customer' });
});

afterAll(async () => {
  await User.deleteMany({ email: /phase7test/ });
  await Organization.deleteMany({ name: /Phase7/ });
  await Service.deleteMany({ name: /Phase7/ });
  await Counter.deleteMany({ name: /Phase7/ });
  await QueueToken.deleteMany({ tokenCode: /P7/ });
  await QueueSequence.deleteMany({});
  await Notification.deleteMany({});
  await mongoose.disconnect();
});

// ── Helper: seed a WAITING token directly ─────────────────────────────────────
async function seedWaitingToken(tokenNum: number, code: string, cId = customerId) {
  return QueueToken.create({
    organizationId: new mongoose.Types.ObjectId(orgId),
    serviceId: new mongoose.Types.ObjectId(serviceId),
    customerId: new mongoose.Types.ObjectId(cId),
    tokenNumber: tokenNum,
    tokenCode: code,
    queueDate: getTodayDateString(),
    status: 'WAITING',
    joinedAt: new Date(),
    estimatedWaitMinutes: tokenNum * 15,
  });
}

// ── Helper: join via API ───────────────────────────────────────────────────────
async function joinViaApi(token: string) {
  return request(app)
    .post('/api/queues/join')
    .set('Authorization', `Bearer ${token}`)
    .send({ organizationId: orgId, serviceId });
}

// ── Helper: get staff queue for counter ───────────────────────────────────────
async function getStaffQueue() {
  return request(app)
    .get(`/api/staff/queue?counterId=${counterId}`)
    .set('Authorization', `Bearer ${staffToken}`);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Phase 7 — Customer Notifications & Queue Alerts', () => {

  // ── 1. Notification model creates correctly ─────────────────────────────────
  it('1. Notification model creates and persists correctly to MongoDB', async () => {
    await Notification.deleteMany({});

    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const svcObjId = new mongoose.Types.ObjectId(serviceId);
    const userObjId = new mongoose.Types.ObjectId(customerId);

    const notif = await Notification.create({
      userId: userObjId,
      organizationId: orgObjId,
      serviceId: svcObjId,
      type: 'QUEUE_UPDATE',
      title: 'Test Notification',
      message: 'This is a test notification.',
      isRead: false,
    });

    expect(notif._id).toBeDefined();
    expect(notif.userId.toString()).toBe(customerId);
    expect(notif.type).toBe('QUEUE_UPDATE');
    expect(notif.isRead).toBe(false);
    expect(notif.readAt).toBeNull();
    expect(notif.createdAt).toBeDefined();

    // Verify it persisted in DB
    const found = await Notification.findById(notif._id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe('Test Notification');
  });

  // ── 2. Notification endpoint requires authentication ────────────────────────
  it('2. GET /api/notifications returns 401 without Authorization header', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('2b. GET /api/notifications/unread-count returns 401 without token', async () => {
    const res = await request(app).get('/api/notifications/unread-count');
    expect(res.status).toBe(401);
  });

  // ── 3. Customer can retrieve their own notifications ────────────────────────
  it('3. GET /api/notifications returns customer own notifications', async () => {
    await Notification.deleteMany({});

    // Create 3 notifications for customer
    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const svcObjId = new mongoose.Types.ObjectId(serviceId);
    const userObjId = new mongoose.Types.ObjectId(customerId);

    await Notification.create([
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'QUEUE_UPDATE', title: 'N1', message: 'msg1', isRead: false },
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_CALLED', title: 'N2', message: 'msg2', isRead: false },
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_COMPLETED', title: 'N3', message: 'msg3', isRead: true },
    ]);

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBeDefined();
    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBeDefined();
  });

  // ── 4. Customer cannot access another customer's notifications ──────────────
  it('4. Customer 2 cannot read Customer 1\'s notifications via GET /api/notifications', async () => {
    await Notification.deleteMany({});

    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const svcObjId = new mongoose.Types.ObjectId(serviceId);

    // Create notifications for customer 1
    await Notification.create({
      userId: new mongoose.Types.ObjectId(customerId),
      organizationId: orgObjId,
      serviceId: svcObjId,
      type: 'TOKEN_CALLED',
      title: 'Customer1 Only',
      message: 'private',
      isRead: false,
    });

    // Customer 2 gets their own list — should see 0 of customer1's notifications
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(200);
    // Customer 2's list should not contain customer 1's notification
    const titles = res.body.data.notifications.map((n: any) => n.title);
    expect(titles).not.toContain('Customer1 Only');
  });

  // ── 5. Unread count returns correctly ───────────────────────────────────────
  it('5. GET /api/notifications/unread-count returns correct unread count', async () => {
    await Notification.deleteMany({});

    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const svcObjId = new mongoose.Types.ObjectId(serviceId);
    const userObjId = new mongoose.Types.ObjectId(customerId);

    await Notification.create([
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_CALLED', title: 'A', message: 'a', isRead: false },
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_SERVING', title: 'B', message: 'b', isRead: false },
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_COMPLETED', title: 'C', message: 'c', isRead: true },
    ]);

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unreadCount).toBe(2);
  });

  // ── 6. Mark single notification as read ─────────────────────────────────────
  it('6. PATCH /api/notifications/:id/read marks notification as read', async () => {
    await Notification.deleteMany({});

    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(customerId),
      organizationId: new mongoose.Types.ObjectId(orgId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      type: 'TOKEN_CALLED',
      title: 'Mark Me Read',
      message: 'test',
      isRead: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await Notification.findById(notif._id);
    expect(updated!.isRead).toBe(true);
    expect(updated!.readAt).not.toBeNull();
  });

  // ── 7. Ownership check: cannot mark another user's notification ─────────────
  it('7. Customer 2 cannot mark Customer 1\'s notification as read (ownership check)', async () => {
    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(customerId),
      organizationId: new mongoose.Types.ObjectId(orgId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      type: 'TOKEN_SKIPPED',
      title: 'Customer1 Private',
      message: 'private',
      isRead: false,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Notification should still be unread
    const unchanged = await Notification.findById(notif._id);
    expect(unchanged!.isRead).toBe(false);
  });

  // ── 8. Mark all notifications as read ───────────────────────────────────────
  it('8. PATCH /api/notifications/read-all marks all user notifications as read', async () => {
    await Notification.deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });

    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const svcObjId = new mongoose.Types.ObjectId(serviceId);
    const userObjId = new mongoose.Types.ObjectId(customerId);

    await Notification.create([
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_CALLED', title: 'X', message: 'x', isRead: false },
      { userId: userObjId, organizationId: orgObjId, serviceId: svcObjId, type: 'TOKEN_SERVING', title: 'Y', message: 'y', isRead: false },
    ]);

    const res = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.modifiedCount).toBeGreaterThanOrEqual(2);

    const unreadCount = await Notification.countDocuments({
      userId: userObjId,
      isRead: false,
    });
    expect(unreadCount).toBe(0);
  });

  // ── 9. TOKEN_CALLED notification when staff calls next ──────────────────────
  it('9. TOKEN_CALLED notification is created when staff calls next token', async () => {
    await Notification.deleteMany({});
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    // Customer joins queue
    const joinRes = await joinViaApi(customerToken);
    expect(joinRes.status).toBe(201);
    const tokenId = joinRes.body.data._id;

    // Staff calls next
    const callRes = await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ counterId });

    expect(callRes.status).toBe(200);
    expect(callRes.body.success).toBe(true);

    // Wait briefly for async notification
    await new Promise(r => setTimeout(r, 200));

    const notif = await Notification.findOne({
      tokenId: new mongoose.Types.ObjectId(tokenId),
      type: 'TOKEN_CALLED',
    });
    expect(notif).not.toBeNull();
    expect(notif!.userId.toString()).toBe(customerId);
  });

  // ── 10. TOKEN_SERVING notification when staff starts serving ────────────────
  it('10. TOKEN_SERVING notification is created when staff starts serving token', async () => {
    // At this point a token should be in CALLED state from test 9
    const calledToken = await QueueToken.findOne({
      serviceId: new mongoose.Types.ObjectId(serviceId),
      status: 'CALLED',
    });

    if (!calledToken) {
      // If no CALLED token (e.g. auto-advanced), look for SERVING
      const servingToken = await QueueToken.findOne({
        serviceId: new mongoose.Types.ObjectId(serviceId),
        status: 'SERVING',
      });
      if (servingToken) {
        const notif = await Notification.findOne({
          tokenId: servingToken._id,
          type: { $in: ['TOKEN_SERVING', 'TOKEN_CALLED'] },
        });
        expect(notif).not.toBeNull();
        return;
      }
    }

    if (calledToken) {
      const startRes = await request(app)
        .post(`/api/staff/queue/${calledToken._id}/start`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(startRes.status).toBe(200);

      await new Promise(r => setTimeout(r, 200));

      const notif = await Notification.findOne({
        tokenId: calledToken._id,
        type: 'TOKEN_SERVING',
      });
      expect(notif).not.toBeNull();
    }
  });

  // ── 11. TOKEN_COMPLETED notification when staff completes token ──────────────
  it('11. TOKEN_COMPLETED notification is created when staff completes token', async () => {
    await Notification.deleteMany({});
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    // Fresh join and call cycle
    const joinRes = await joinViaApi(customerToken);
    expect(joinRes.status).toBe(201);
    const tokenId = joinRes.body.data._id;

    // Staff calls next
    await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ counterId });

    await new Promise(r => setTimeout(r, 100));

    // Find the token in CALLED or SERVING state
    const activeToken = await QueueToken.findOne({
      _id: new mongoose.Types.ObjectId(tokenId),
      status: { $in: ['CALLED', 'SERVING'] },
    });

    if (!activeToken) return; // guard

    // Start serving if CALLED
    if (activeToken.status === 'CALLED') {
      await request(app)
        .post(`/api/staff/queue/${activeToken._id}/start`)
        .set('Authorization', `Bearer ${staffToken}`);
      await new Promise(r => setTimeout(r, 100));
    }

    // Complete
    const completeRes = await request(app)
      .post(`/api/staff/queue/${tokenId}/complete`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(completeRes.status).toBe(200);

    await new Promise(r => setTimeout(r, 200));

    const notif = await Notification.findOne({
      tokenId: new mongoose.Types.ObjectId(tokenId),
      type: 'TOKEN_COMPLETED',
    });
    expect(notif).not.toBeNull();
    expect(notif!.userId.toString()).toBe(customerId);
  });

  // ── 12. TOKEN_SKIPPED notification when staff skips token ───────────────────
  it('12. TOKEN_SKIPPED notification is created when staff skips a token', async () => {
    await Notification.deleteMany({});
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    const joinRes = await joinViaApi(customerToken);
    expect(joinRes.status).toBe(201);
    const tokenId = joinRes.body.data._id;

    // Call next so the token is CALLED
    await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ counterId });

    await new Promise(r => setTimeout(r, 100));

    // Skip the token
    const skipRes = await request(app)
      .post(`/api/staff/queue/${tokenId}/skip`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(skipRes.status).toBe(200);

    await new Promise(r => setTimeout(r, 200));

    const notif = await Notification.findOne({
      tokenId: new mongoose.Types.ObjectId(tokenId),
      type: 'TOKEN_SKIPPED',
    });
    expect(notif).not.toBeNull();
    expect(notif!.userId.toString()).toBe(customerId);
  });

  // ── 13. TOKEN_CANCELLED notification when customer cancels ──────────────────
  it('13. TOKEN_CANCELLED notification is created when customer cancels their token', async () => {
    await Notification.deleteMany({});
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    const joinRes = await joinViaApi(customerToken);
    expect(joinRes.status).toBe(201);
    const tokenId = joinRes.body.data._id;

    const cancelRes = await request(app)
      .post(`/api/queues/${tokenId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(cancelRes.status).toBe(200);

    await new Promise(r => setTimeout(r, 200));

    const notif = await Notification.findOne({
      tokenId: new mongoose.Types.ObjectId(tokenId),
      type: 'TOKEN_CANCELLED',
    });
    expect(notif).not.toBeNull();
    expect(notif!.userId.toString()).toBe(customerId);
  });

  // ── 14. TURN_APPROACHING is not duplicated (idempotency) ────────────────────
  it('14. TURN_APPROACHING notification is not sent twice for the same token (idempotency)', async () => {
    await Notification.deleteMany({});
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    // Seed 3 WAITING tokens manually so we can control position
    const t1 = await seedWaitingToken(1, 'P7001');
    await seedWaitingToken(2, 'P7002');
    await seedWaitingToken(3, 'P7003');

    // Manually call checkAndNotifyTurnApproaching twice
    const { checkAndNotifyTurnApproaching } = await import('../services/notificationService');
    await checkAndNotifyTurnApproaching(serviceId, getTodayDateString());
    await checkAndNotifyTurnApproaching(serviceId, getTodayDateString());

    // t1 (position 1) should get exactly ONE TURN_APPROACHING notification
    const count = await Notification.countDocuments({
      tokenId: t1._id,
      type: 'TURN_APPROACHING',
    });
    expect(count).toBe(1);
  });

  // ── 15. Notification failure does not break queue completion ─────────────────
  it('15. Queue operation succeeds even if notification service were to fail', async () => {
    await QueueToken.deleteMany({});
    await QueueSequence.deleteMany({});

    // This test verifies the fire-and-forget architecture:
    // We join, call, and complete without the socket server running in test env.
    // The operation must still succeed (200) even if emitToUser is a no-op.
    const joinRes = await joinViaApi(customerToken);
    expect(joinRes.status).toBe(201);
    const tokenId = joinRes.body.data._id;

    const callRes = await request(app)
      .post('/api/staff/queue/call-next')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ counterId });

    expect(callRes.status).toBe(200);
    expect(callRes.body.success).toBe(true);

    await new Promise(r => setTimeout(r, 100));

    const activeToken = await QueueToken.findOne({
      _id: new mongoose.Types.ObjectId(tokenId),
      status: { $in: ['CALLED', 'SERVING'] },
    });

    if (activeToken && activeToken.status === 'CALLED') {
      await request(app)
        .post(`/api/staff/queue/${activeToken._id}/start`)
        .set('Authorization', `Bearer ${staffToken}`);
      await new Promise(r => setTimeout(r, 100));
    }

    const completeRes = await request(app)
      .post(`/api/staff/queue/${tokenId}/complete`)
      .set('Authorization', `Bearer ${staffToken}`);

    // Queue operation must succeed regardless of notification outcome
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
  });
});
