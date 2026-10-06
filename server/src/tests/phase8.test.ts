/**
 * Phase 8 Tests — Analytics & Reporting
 *
 * Tests verify:
 *  1. Organization admin can access overview (GET /api/analytics/overview)
 *  2. Customer cannot access analytics (403)
 *  3. Staff cannot access organization analytics (403)
 *  4. Unauthorized users cannot access analytics (401)
 *  5. Organization isolation works (Admin 1 only sees Org 1 data)
 *  6. Cross-organization query is rejected with 403
 *  7. Overview totalTokens is correct
 *  8. Completed count is correct
 *  9. Cancelled count is correct
 * 10. Skipped count is correct
 * 11. Waiting count is correct
 * 12. Serving count is correct
 * 13. Average waiting time is calculated accurately
 * 14. Average service time is calculated accurately
 * 15. Completion rate is calculated accurately
 * 16. Cancellation rate is calculated accurately
 * 17. Daily trend analytics works (GET /api/analytics/daily)
 * 18. Service performance analytics works (GET /api/analytics/services)
 * 19. Counter performance analytics works (GET /api/analytics/counters)
 * 20. Staff performance analytics works (GET /api/analytics/staff)
 * 21. Invalid date range (from > to) is rejected (400)
 * 22. Malformed date format is rejected (400)
 * 23. Empty date range returns safe zero metrics without errors
 * 24. Analytics response does not expose customer personal information (PII)
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
import { generateAccessToken } from '../utils/token';
import { getTodayDateString } from '../services/queueEngine';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

let admin1Token: string;
let admin2Token: string;
let customerToken: string;
let staffToken: string;

let org1: any;
let org2: any;
let svc1: any;
let svc2: any;
let counter1: any;
let counter2: any;
let staffUser: any;
let customerUser: any;

const TODAY = getTodayDateString();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  // Cleanup existing phase 8 data
  await User.deleteMany({ email: /phase8test/ });
  await Organization.deleteMany({ name: /Phase8/ });
  await Service.deleteMany({ name: /Phase8/ });
  await Counter.deleteMany({ name: /Phase8/ });
  await QueueToken.deleteMany({});

  // 1. Admin 1 & Organization 1
  const admin1 = await User.create({
    fullName: 'Phase8 Admin One',
    email: 'phase8test.admin1@test.com',
    phone: '0800000081',
    passwordHash: 'secret_hash_admin1',
    role: 'organization_admin',
    isActive: true,
  });

  org1 = await Organization.create({
    name: 'Phase8 Metro Hospital',
    category: 'Healthcare',
    address: '100 Health Blvd',
    phone: '100-000-0081',
    email: 'metro@phase8.com',
    ownerId: admin1._id,
    isActive: true,
  });

  admin1.organizationId = org1._id;
  await admin1.save();
  admin1Token = generateAccessToken({ userId: admin1._id.toString(), role: 'organization_admin' });

  // 2. Admin 2 & Organization 2 (for cross-org testing)
  const admin2 = await User.create({
    fullName: 'Phase8 Admin Two',
    email: 'phase8test.admin2@test.com',
    phone: '0800000082',
    passwordHash: 'secret_hash_admin2',
    role: 'organization_admin',
    isActive: true,
  });

  org2 = await Organization.create({
    name: 'Phase8 City Bank',
    category: 'Finance',
    address: '200 Finance St',
    phone: '200-000-0082',
    email: 'bank@phase8.com',
    ownerId: admin2._id,
    isActive: true,
  });

  admin2.organizationId = org2._id;
  await admin2.save();
  admin2Token = generateAccessToken({ userId: admin2._id.toString(), role: 'organization_admin' });

  // 3. Services for Org 1
  svc1 = await Service.create({
    name: 'General Consultation',
    description: 'General doctor consultation',
    organizationId: org1._id,
    estimatedServiceTime: 15,
    isActive: true,
  });

  svc2 = await Service.create({
    name: 'Laboratory Tests',
    description: 'Blood and diagnostic testing',
    organizationId: org1._id,
    estimatedServiceTime: 10,
    isActive: true,
  });

  // 4. Counters for Org 1
  counter1 = await Counter.create({
    name: 'Consultation Counter 1',
    organizationId: org1._id,
    serviceId: svc1._id,
    isActive: true,
  });

  counter2 = await Counter.create({
    name: 'Lab Counter 1',
    organizationId: org1._id,
    serviceId: svc2._id,
    isActive: true,
  });

  // 5. Staff user for Org 1 assigned to Counter 1
  staffUser = await User.create({
    fullName: 'Dr. Sarah Connor',
    email: 'phase8test.staff@test.com',
    phone: '0800000083',
    passwordHash: 'secret_hash_staff',
    role: 'staff',
    organizationId: org1._id,
    counterId: counter1._id,
    isActive: true,
  });
  staffToken = generateAccessToken({ userId: staffUser._id.toString(), role: 'staff' });

  // 6. Customer User
  customerUser = await User.create({
    fullName: 'Alice Patient',
    email: 'phase8test.customer@test.com',
    phone: '0800000084',
    passwordHash: 'secret_hash_customer',
    role: 'customer',
    isActive: true,
  });
  customerToken = generateAccessToken({ userId: customerUser._id.toString(), role: 'customer' });

  // 7. Seed Tokens for Org 1:
  // Token 1: COMPLETED (Wait = 20 min, Service = 10 min)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc1._id,
    customerId: customerUser._id,
    counterId: counter1._id,
    tokenNumber: 1,
    tokenCode: 'A001',
    queueDate: TODAY,
    status: 'COMPLETED',
    joinedAt: new Date(`${TODAY}T10:00:00Z`),
    servingStartedAt: new Date(`${TODAY}T10:20:00Z`),
    completedAt: new Date(`${TODAY}T10:30:00Z`),
  });

  // Token 2: COMPLETED (Wait = 30 min, Service = 20 min)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc1._id,
    customerId: customerUser._id,
    counterId: counter1._id,
    tokenNumber: 2,
    tokenCode: 'A002',
    queueDate: TODAY,
    status: 'COMPLETED',
    joinedAt: new Date(`${TODAY}T10:10:00Z`),
    servingStartedAt: new Date(`${TODAY}T10:40:00Z`),
    completedAt: new Date(`${TODAY}T11:00:00Z`),
  });

  // Token 3: CANCELLED (Joined and cancelled)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc1._id,
    customerId: customerUser._id,
    tokenNumber: 3,
    tokenCode: 'A003',
    queueDate: TODAY,
    status: 'CANCELLED',
    joinedAt: new Date(`${TODAY}T10:15:00Z`),
    cancelledAt: new Date(`${TODAY}T10:25:00Z`),
  });

  // Token 4: SKIPPED (Joined, called at counter1, skipped)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc1._id,
    customerId: customerUser._id,
    counterId: counter1._id,
    tokenNumber: 4,
    tokenCode: 'A004',
    queueDate: TODAY,
    status: 'SKIPPED',
    joinedAt: new Date(`${TODAY}T10:20:00Z`),
    calledAt: new Date(`${TODAY}T10:45:00Z`),
  });

  // Token 5: WAITING (In queue)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc2._id,
    customerId: customerUser._id,
    tokenNumber: 5,
    tokenCode: 'B001',
    queueDate: TODAY,
    status: 'WAITING',
    joinedAt: new Date(`${TODAY}T10:50:00Z`),
  });

  // Token 6: SERVING (Wait = 30 min, currently being served, no completedAt yet)
  await QueueToken.create({
    organizationId: org1._id,
    serviceId: svc2._id,
    customerId: customerUser._id,
    counterId: counter2._id,
    tokenNumber: 6,
    tokenCode: 'B002',
    queueDate: TODAY,
    status: 'SERVING',
    joinedAt: new Date(`${TODAY}T10:30:00Z`),
    servingStartedAt: new Date(`${TODAY}T11:00:00Z`),
  });

  // 8. Seed 1 Token for Org 2 (Org 2 Service, 1 completed token)
  const org2Svc = await Service.create({
    name: 'Org 2 Deposit',
    organizationId: org2._id,
    estimatedServiceTime: 5,
    isActive: true,
  });

  await QueueToken.create({
    organizationId: org2._id,
    serviceId: org2Svc._id,
    customerId: customerUser._id,
    tokenNumber: 1,
    tokenCode: 'D001',
    queueDate: TODAY,
    status: 'COMPLETED',
    joinedAt: new Date(`${TODAY}T09:00:00Z`),
    servingStartedAt: new Date(`${TODAY}T09:05:00Z`),
    completedAt: new Date(`${TODAY}T09:10:00Z`),
  });
});

afterAll(async () => {
  await User.deleteMany({ email: /phase8test/ });
  await Organization.deleteMany({ name: /Phase8/ });
  await Service.deleteMany({ name: /Phase8/ });
  await Counter.deleteMany({ name: /Phase8/ });
  await QueueToken.deleteMany({});
  await mongoose.disconnect();
});

describe('Phase 8 — Analytics & Reporting Tests', () => {
  // ── 1. Admin access ────────────────────────────────────────────────────────
  it('1. Organization admin can access overview analytics', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.organizationId).toBe(org1._id.toString());
  });

  // ── 2. Customer rejected ───────────────────────────────────────────────────
  it('2. Customer cannot access analytics (returns 403)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── 3. Staff rejected ──────────────────────────────────────────────────────
  it('3. Staff cannot access organization analytics (returns 403)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── 4. Unauthenticated rejected ────────────────────────────────────────────
  it('4. Unauthorized request without token returns 401', async () => {
    const res = await request(app).get('/api/analytics/overview');
    expect(res.status).toBe(401);
  });

  // ── 5. Organization isolation ──────────────────────────────────────────────
  it('5. Organization isolation works: Admin 1 only sees Org 1 tokens (total = 6, not 7)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    // 6 tokens in Org 1, 1 in Org 2
    expect(res.body.data.totalTokens).toBe(6);
  });

  // ── 6. Cross-organization access rejected ──────────────────────────────────
  it('6. Cross-organization query with unauthorized organizationId returns 403', async () => {
    const res = await request(app)
      .get(`/api/analytics/overview?organizationId=${org2._id}`)
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // ── 7–12. Metric Counts Verification ───────────────────────────────────────
  it('7. Overview totalTokens count is correct (6)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.totalTokens).toBe(6);
  });

  it('8. Completed tokens count is correct (2)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.completedTokens).toBe(2);
  });

  it('9. Cancelled tokens count is correct (1)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.cancelledTokens).toBe(1);
  });

  it('10. Skipped tokens count is correct (1)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.skippedTokens).toBe(1);
  });

  it('11. Waiting tokens count is correct (1)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.waitingTokens).toBe(1);
  });

  it('12. Serving tokens count is correct (1)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.servingTokens).toBe(1);
  });

  // ── 13. Average Waiting Time ───────────────────────────────────────────────
  it('13. Average waiting time is correctly calculated (avg of 20, 30, 30 min = 26.7 min)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    // (20 + 30 + 30) / 3 = 80 / 3 = 26.666... -> 26.7
    expect(res.body.data.averageWaitingTime).toBe(26.7);
  });

  // ── 14. Average Service Time ───────────────────────────────────────────────
  it('14. Average service time is correctly calculated (avg of 10, 20 min = 15.0 min)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    // (10 + 20) / 2 = 15.0
    expect(res.body.data.averageServiceTime).toBe(15);
  });

  // ── 15. Completion Rate ────────────────────────────────────────────────────
  it('15. Completion rate is correctly calculated (2 / 6 * 100 = 33.3%)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.completionRate).toBe(33.3);
  });

  // ── 16. Cancellation Rate ──────────────────────────────────────────────────
  it('16. Cancellation rate is correctly calculated (1 / 6 * 100 = 16.7%)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.body.data.cancellationRate).toBe(16.7);
  });

  // ── 17. Daily Trend Analytics ──────────────────────────────────────────────
  it('17. GET /api/analytics/daily returns daily trend items', async () => {
    const res = await request(app)
      .get('/api/analytics/daily')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const todayEntry = res.body.data.find((d: any) => d.date === TODAY);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.totalTokens).toBe(6);
    expect(todayEntry.completedTokens).toBe(2);
    expect(todayEntry.cancelledTokens).toBe(1);
    expect(todayEntry.skippedTokens).toBe(1);
    expect(todayEntry.averageWaitingTime).toBe(26.7);
    expect(todayEntry.averageServiceTime).toBe(15);
  });

  // ── 18. Service Performance Analytics ──────────────────────────────────────
  it('18. GET /api/analytics/services returns service-level breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/services')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const s1 = res.body.data.find((s: any) => s.serviceId === svc1._id.toString());
    expect(s1).toBeDefined();
    expect(s1.serviceName).toBe('General Consultation');
    expect(s1.totalTokens).toBe(4); // Tokens 1, 2, 3, 4
    expect(s1.completedTokens).toBe(2);
    expect(s1.cancelledTokens).toBe(1);
    expect(s1.skippedTokens).toBe(1);
    expect(s1.completionRate).toBe(50); // 2 / 4 * 100
  });

  // ── 19. Counter Performance Analytics ──────────────────────────────────────
  it('19. GET /api/analytics/counters returns counter-level breakdown', async () => {
    const res = await request(app)
      .get('/api/analytics/counters')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const c1 = res.body.data.find((c: any) => c.counterId === counter1._id.toString());
    expect(c1).toBeDefined();
    expect(c1.counterName).toBe('Consultation Counter 1');
    expect(c1.totalCompleted).toBe(2); // Tokens 1, 2
    expect(c1.skippedTokens).toBe(1);  // Token 4
  });

  // ── 20. Staff Performance Analytics ────────────────────────────────────────
  it('20. GET /api/analytics/staff returns staff operational statistics', async () => {
    const res = await request(app)
      .get('/api/analytics/staff')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    const staffMember = res.body.data.find((s: any) => s.staffId === staffUser._id.toString());
    expect(staffMember).toBeDefined();
    expect(staffMember.staffName).toBe('Dr. Sarah Connor');
    expect(staffMember.counterId).toBe(counter1._id.toString());
    expect(staffMember.totalCompleted).toBe(2);
    expect(staffMember.totalSkipped).toBe(1);
    expect(staffMember.averageTokensHandled).toBe(3);
    expect(staffMember.attributionNote).toBeDefined();
  });

  // ── 21. Invalid date range rejected ────────────────────────────────────────
  it('21. Invalid date range (from > to) is rejected with 400', async () => {
    const res = await request(app)
      .get('/api/analytics/overview?from=2026-10-10&to=2026-10-01')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/date/i);
  });

  // ── 22. Malformed date format rejected ─────────────────────────────────────
  it('22. Malformed date format is rejected with 400', async () => {
    const res = await request(app)
      .get('/api/analytics/overview?from=invalid-date&to=2026-10-06')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ── 23. Empty date range safe handling ─────────────────────────────────────
  it('23. Date range with no activity returns safe zero metrics without errors', async () => {
    const res = await request(app)
      .get('/api/analytics/overview?from=2020-01-01&to=2020-01-02')
      .set('Authorization', `Bearer ${admin1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTokens).toBe(0);
    expect(res.body.data.completedTokens).toBe(0);
    expect(res.body.data.completionRate).toBe(0);
    expect(res.body.data.averageWaitingTime).toBe(0);
    expect(res.body.data.averageServiceTime).toBe(0);
  });

  // ── 24. PII Protection ─────────────────────────────────────────────────────
  it('24. Analytics response does not expose customer personal information (PII)', async () => {
    const res = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${admin1Token}`);

    const json = JSON.stringify(res.body);

    expect(json).not.toContain('Alice Patient');
    expect(json).not.toContain('phase8test.customer@test.com');
    expect(json).not.toContain('0800000084');
    expect(json).not.toContain('secret_hash_customer');
    expect(json).not.toContain('secret_hash_admin1');
    expect(json).not.toContain('secret_hash_staff');
  });
});
