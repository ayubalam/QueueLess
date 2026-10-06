/**
 * Phase 6 Tests — QR Code & Public Queue Display
 *
 * Tests verify:
 * 1.  Public service endpoint works (GET /api/public/services/:serviceId)
 * 2.  Invalid service returns 404
 * 3.  Inactive service is rejected (404)
 * 4.  Public queue status works (GET /api/public/queues/:serviceId)
 * 5.  Public queue response does not expose customerId
 * 6.  Public queue response does not expose private customer data
 * 7.  Waiting count is correct
 * 8.  Current serving token is returned correctly
 * 9.  Next tokens are returned correctly (up to 5, ordered)
 * 10. Public endpoints do not require authentication
 * 11. Organization admin authorization works for service endpoints
 * 12. Cross-organization admin access is rejected (403)
 * 13. Existing Phase 1–5 functionality continues to work
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
import { generateAccessToken } from '../utils/token';
import { getTodayDateString } from '../services/queueEngine';

let orgAdmin1Token: string;
let orgAdmin2Token: string;
let customerToken: string;

let org1: any;
let org2: any;
let activeService1: any;
let inactiveService: any;
let org2Service: any;
let counter1: any;

beforeAll(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/queueless_test';
  await mongoose.connect(MONGO_URI);

  // Clean collections for test
  await User.deleteMany({ email: /phase6test/ });
  await Organization.deleteMany({ name: /Phase6/ });
  await Service.deleteMany({ name: /Phase6/ });
  await Counter.deleteMany({ name: /Phase6/ });
  await QueueToken.deleteMany({ tokenCode: /P6/ });
  await QueueSequence.deleteMany({});

  // 1. Create Org Admin 1
  const admin1 = await User.create({
    fullName: 'Phase6 Admin One',
    email: 'phase6test.admin1@test.com',
    phone: '0000000061',
    passwordHash: 'hashed',
    role: 'organization_admin',
    isActive: true,
  });

  // 2. Create Org 1
  org1 = await Organization.create({
    name: 'Phase6 Health Clinic',
    category: 'Healthcare',
    address: '100 Medical Plaza',
    phone: '123-456-7890',
    email: 'clinic@phase6.com',
    ownerId: admin1._id,
    isActive: true,
  });

  admin1.organizationId = org1._id;
  await admin1.save();
  orgAdmin1Token = generateAccessToken({ userId: admin1._id.toString(), role: 'organization_admin' });

  // 3. Create Org Admin 2 & Org 2 (for cross-org testing)
  const admin2 = await User.create({
    fullName: 'Phase6 Admin Two',
    email: 'phase6test.admin2@test.com',
    phone: '0000000062',
    passwordHash: 'hashed',
    role: 'organization_admin',
    isActive: true,
  });

  org2 = await Organization.create({
    name: 'Phase6 Financial Services',
    category: 'Finance',
    address: '200 Bank St',
    phone: '987-654-3210',
    email: 'finance@phase6.com',
    ownerId: admin2._id,
    isActive: true,
  });

  admin2.organizationId = org2._id;
  await admin2.save();
  orgAdmin2Token = generateAccessToken({ userId: admin2._id.toString(), role: 'organization_admin' });

  // 4. Create Active Service under Org 1
  activeService1 = await Service.create({
    name: 'General Consultation',
    description: 'Walk-in doctor consultation',
    organizationId: org1._id,
    estimatedServiceTime: 15,
    isActive: true,
  });

  // 5. Create Inactive Service under Org 1
  inactiveService = await Service.create({
    name: 'Specialist Surgery',
    description: 'Requires prior appointment',
    organizationId: org1._id,
    estimatedServiceTime: 60,
    isActive: false,
  });

  // 6. Create Service under Org 2
  org2Service = await Service.create({
    name: 'Account Opening',
    description: 'New bank account opening',
    organizationId: org2._id,
    estimatedServiceTime: 20,
    isActive: true,
  });

  // 7. Counter under Org 1
  counter1 = await Counter.create({
    name: 'Counter 1',
    organizationId: org1._id,
    serviceId: activeService1._id,
    location: 'Ground Floor Room 101',
    isActive: true,
  });

  // 8. Create Customer & Tokens
  const customer = await User.create({
    fullName: 'John Doe Customer',
    email: 'phase6test.customer@test.com',
    phone: '0000000063',
    passwordHash: 'secretpasswordhash123',
    role: 'customer',
    isActive: true,
  });
  customerToken = generateAccessToken({ userId: customer._id.toString(), role: 'customer' });

  const today = getTodayDateString();

  // Create 1 SERVING token
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: activeService1._id,
    customerId: customer._id,
    counterId: counter1._id,
    tokenNumber: 1,
    tokenCode: 'P6001',
    queueDate: today,
    status: 'SERVING',
    joinedAt: new Date(Date.now() - 30 * 60000),
    servingStartedAt: new Date(),
    estimatedWaitMinutes: 0,
  });

  // Create 6 WAITING tokens
  for (let i = 2; i <= 7; i++) {
    await QueueToken.create({
      organizationId: org1._id,
      serviceId: activeService1._id,
      customerId: customer._id,
      tokenNumber: i,
      tokenCode: `P600${i}`,
      queueDate: today,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - (30 - i) * 60000),
      estimatedWaitMinutes: (i - 1) * 15,
    });
  }
});

afterAll(async () => {
  await User.deleteMany({ email: /phase6test/ });
  await Organization.deleteMany({ name: /Phase6/ });
  await Service.deleteMany({ name: /Phase6/ });
  await Counter.deleteMany({ name: /Phase6/ });
  await QueueToken.deleteMany({ tokenCode: /P6/ });
  await QueueSequence.deleteMany({});
  await mongoose.disconnect();
});

describe('Phase 6 — QR Code & Public Queue Display Tests', () => {
  // ── 1. Public service endpoint works ───────────────────────────────────────
  it('1. GET /api/public/services/:serviceId returns safe public service information', async () => {
    const res = await request(app).get(`/api/public/services/${activeService1._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.serviceId).toBe(activeService1._id.toString());
    expect(data.name).toBe('General Consultation');
    expect(data.description).toBe('Walk-in doctor consultation');
    expect(data.estimatedServiceTime).toBe(15);
    expect(data.organizationName).toBe('Phase6 Health Clinic');
    expect(data.organizationAddress).toBe('100 Medical Plaza');
    expect(data.organizationPhone).toBe('123-456-7890');
    expect(data.organizationEmail).toBe('clinic@phase6.com');
    expect(data.isActive).toBe(true);
  });

  // ── 2. Invalid service returns 404 ─────────────────────────────────────────
  it('2. GET /api/public/services/:serviceId with invalid or nonexistent ID returns 404', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/public/services/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);

    // Invalid ObjectId string
    const invalidIdRes = await request(app).get('/api/public/services/invalid-id-string');
    expect(invalidIdRes.status).toBe(404);
  });

  // ── 3. Inactive service is rejected (404) ──────────────────────────────────
  it('3. GET /api/public/services/:serviceId returns 404 for inactive service', async () => {
    const res = await request(app).get(`/api/public/services/${inactiveService._id}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive|not found/i);
  });

  // ── 4. Public queue status works ───────────────────────────────────────────
  it('4. GET /api/public/queues/:serviceId returns current public queue status', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const data = res.body.data;
    expect(data.serviceId).toBe(activeService1._id.toString());
    expect(data.serviceName).toBe('General Consultation');
    expect(data.organizationName).toBe('Phase6 Health Clinic');
    expect(data.queueDate).toBe(getTodayDateString());
    expect(data.lastUpdated).toBeDefined();
  });

  // ── 5. Response does not expose customerId ─────────────────────────────────
  it('5. Public queue response does not expose customerId on any token', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    // Check serving token
    if (data.currentServingToken) {
      expect(data.currentServingToken).not.toHaveProperty('customerId');
      expect(data.currentServingToken).not.toHaveProperty('_id');
    }

    // Check next tokens array
    for (const token of data.nextTokens) {
      expect(token).not.toHaveProperty('customerId');
      expect(token).not.toHaveProperty('_id');
    }
  });

  // ── 6. Response does not expose private customer data ──────────────────────
  it('6. Public queue response does not expose private customer data (passwords, emails, phone)', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);
    const jsonStr = JSON.stringify(res.body);

    expect(jsonStr).not.toContain('secretpasswordhash123');
    expect(jsonStr).not.toContain('phase6test.customer@test.com');
    expect(jsonStr).not.toContain('0000000063');
    expect(jsonStr).not.toContain('John Doe Customer');
  });

  // ── 7. Waiting count is correct ────────────────────────────────────────────
  it('7. Public queue status correctly counts waiting tokens', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);

    expect(res.status).toBe(200);
    // We created 6 WAITING tokens
    expect(res.body.data.waitingCount).toBe(6);
  });

  // ── 8. Current serving token is returned correctly ─────────────────────────
  it('8. Public queue status returns the currently SERVING token', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);

    expect(res.status).toBe(200);
    const serving = res.body.data.currentServingToken;
    expect(serving).toBeDefined();
    expect(serving.tokenCode).toBe('P6001');
    expect(serving.status).toBe('SERVING');
    expect(serving.counterName).toBe('Counter 1');
    expect(res.body.data.currentServingStatus).toBe('SERVING');
  });

  // ── 9. Next tokens are returned correctly ──────────────────────────────────
  it('9. Next tokens list is ordered by tokenNumber and capped at 5', async () => {
    const res = await request(app).get(`/api/public/queues/${activeService1._id}`);

    expect(res.status).toBe(200);
    const nextTokens = res.body.data.nextTokens;

    // Although 6 waiting tokens exist (P6002 through P6007), limit is 5
    expect(nextTokens.length).toBe(5);
    expect(nextTokens[0].tokenCode).toBe('P6002');
    expect(nextTokens[1].tokenCode).toBe('P6003');
    expect(nextTokens[2].tokenCode).toBe('P6004');
    expect(nextTokens[3].tokenCode).toBe('P6005');
    expect(nextTokens[4].tokenCode).toBe('P6006');

    for (const t of nextTokens) {
      expect(t.status).toBe('WAITING');
    }
  });

  // ── 10. Public endpoints do not require authentication ─────────────────────
  it('10. Public endpoints succeed with NO Authorization header', async () => {
    const resService = await request(app).get(`/api/public/services/${activeService1._id}`);
    expect(resService.status).toBe(200);

    const resQueue = await request(app).get(`/api/public/queues/${activeService1._id}`);
    expect(resQueue.status).toBe(200);
  });

  // ── 11. Org admin authorization for service management ─────────────────────
  it('11. Authorized organization admin can access and manage their own services', async () => {
    const res = await request(app)
      .get(`/api/services?organizationId=${org1._id}`)
      .set('Authorization', `Bearer ${orgAdmin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // ── 12. Cross-organization admin access is rejected ────────────────────────
  it('12. Cross-organization admin access is rejected with 403', async () => {
    // Org Admin 2 tries to manage Org 1's services
    const res = await request(app)
      .get(`/api/services?organizationId=${org1._id}`)
      .set('Authorization', `Bearer ${orgAdmin2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── 13. Customer cannot join inactive service ──────────────────────────────
  it('13. Customer queue join is rejected if service is inactive', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        organizationId: org1._id.toString(),
        serviceId: inactiveService._id.toString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/inactive/i);
  });
});
