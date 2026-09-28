import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { QueueToken } from '../models/QueueToken';
import { QueueSequence } from '../models/QueueSequence';
import { generateAccessToken } from '../utils/token';
import { getTodayDateString } from '../services/queueEngine';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

let customerToken: string;
let customer2Token: string;
let staffToken: string;
let unassignedStaffToken: string;
let otherOrgStaffToken: string;
let orgAdminToken: string;

let customerId: string;
let staffId: string;
let activeOrgId: string;
let activeServiceId: string;
let activeCounterId: string;

let secondOrgId: string;
let secondServiceId: string;
let secondCounterId: string;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Service.deleteMany({});
  await Counter.deleteMany({});
  await QueueToken.deleteMany({});
  await QueueSequence.deleteMany({});
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Service.deleteMany({});
  await Counter.deleteMany({});
  await QueueToken.deleteMany({});
  await QueueSequence.deleteMany({});

  // Org Admin
  const admin = await User.create({
    fullName: 'Admin User',
    email: 'admin@test.com',
    phone: '+15559990000',
    passwordHash: 'dummyhash',
    role: 'organization_admin',
    isActive: true,
  });
  orgAdminToken = generateAccessToken({ userId: admin._id.toString(), role: admin.role });

  // Organization 1
  const activeOrg = await Organization.create({
    name: 'General Clinic',
    address: '100 Health Way',
    phone: '+15552000001',
    email: 'info@clinic.org',
    category: 'Healthcare',
    ownerId: admin._id,
    isActive: true,
  });
  activeOrgId = activeOrg._id.toString();

  // Service 1
  const activeService = await Service.create({
    organizationId: activeOrg._id,
    name: 'General Consultation',
    description: 'General doctor consultation',
    estimatedServiceTime: 15,
    isActive: true,
  });
  activeServiceId = activeService._id.toString();

  // Counter 1
  const activeCounter = await Counter.create({
    organizationId: activeOrg._id,
    serviceId: activeService._id,
    name: 'Counter 1',
    isActive: true,
  });
  activeCounterId = activeCounter._id.toString();

  // Organization 2
  const secondOrg = await Organization.create({
    name: 'Separate Org',
    address: '300 Other Ave',
    phone: '+15552000003',
    email: 'info@separate.org',
    category: 'Finance',
    ownerId: admin._id,
    isActive: true,
  });
  secondOrgId = secondOrg._id.toString();

  // Service 2
  const secondService = await Service.create({
    organizationId: secondOrg._id,
    name: 'Cash Counter',
    estimatedServiceTime: 10,
    isActive: true,
  });
  secondServiceId = secondService._id.toString();

  // Counter 2
  const secondCounter = await Counter.create({
    organizationId: secondOrg._id,
    serviceId: secondService._id,
    name: 'Counter 2',
    isActive: true,
  });
  secondCounterId = secondCounter._id.toString();

  // Staff 1 (Org 1, Counter 1)
  const staff = await User.create({
    fullName: 'Staff Member',
    email: 'staff@test.com',
    phone: '+15551110001',
    passwordHash: 'dummyhash',
    role: 'staff',
    organizationId: activeOrg._id,
    counterId: activeCounter._id,
    isActive: true,
  });
  staffId = staff._id.toString();
  staffToken = generateAccessToken({ userId: staffId, role: staff.role });

  // Unassigned Staff (Org 1, no counter)
  const unassignedStaff = await User.create({
    fullName: 'Unassigned Staff',
    email: 'unassigned@test.com',
    phone: '+15551110002',
    passwordHash: 'dummyhash',
    role: 'staff',
    organizationId: activeOrg._id,
    isActive: true,
  });
  unassignedStaffToken = generateAccessToken({ userId: unassignedStaff._id.toString(), role: unassignedStaff.role });

  // Other Org Staff (Org 2, Counter 2)
  const otherStaff = await User.create({
    fullName: 'Other Staff',
    email: 'other@test.com',
    phone: '+15551110003',
    passwordHash: 'dummyhash',
    role: 'staff',
    organizationId: secondOrg._id,
    counterId: secondCounter._id,
    isActive: true,
  });
  otherOrgStaffToken = generateAccessToken({ userId: otherStaff._id.toString(), role: otherStaff.role });

  // Customer 1
  const cust1 = await User.create({
    fullName: 'Alice Customer',
    email: 'alice@test.com',
    phone: '+15551110004',
    passwordHash: 'dummyhash',
    role: 'customer',
    isActive: true,
  });
  customerId = cust1._id.toString();
  customerToken = generateAccessToken({ userId: customerId, role: cust1.role });

  // Customer 2
  const cust2 = await User.create({
    fullName: 'Bob Customer',
    email: 'bob@test.com',
    phone: '+15551110005',
    passwordHash: 'dummyhash',
    role: 'customer',
    isActive: true,
  });
  customer2Token = generateAccessToken({ userId: cust2._id.toString(), role: cust2.role });
});

describe('Phase 4: Staff Queue Operations API', () => {

  it('2. Customer cannot access staff queue endpoint', async () => {
    const res = await request(app).get('/api/staff/queue').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it('3. Organization admin cannot perform staff queue operations directly', async () => {
    const res = await request(app).get('/api/staff/queue').set('Authorization', `Bearer ${orgAdminToken}`);
    expect(res.status).toBe(403); // Needs role 'staff'
  });

  it('4. Unassigned staff cannot operate a counter', async () => {
    const res = await request(app).get('/api/staff/queue').set('Authorization', `Bearer ${unassignedStaffToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('not assigned to a counter');
  });

  it('1. Staff can view assigned queue', async () => {
    const res = await request(app).get('/api/staff/queue').set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.counter._id).toBe(activeCounterId);
    expect(res.body.data.service._id).toBe(activeServiceId);
    expect(res.body.data.stats).toBeDefined();
  });

  it('5-8 & 14-16 & 21-22: Full Token Lifecycle (Call Next, Start, Complete) with Position Updates', async () => {
    // Customers join queue
    await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customerToken}`).send({ organizationId: activeOrgId, serviceId: activeServiceId });
    await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customer2Token}`).send({ organizationId: activeOrgId, serviceId: activeServiceId });

    // Verify queue positions initially (Cust 1: pos 1, Cust 2: pos 2)
    const initRes = await request(app).get('/api/queues/my-active').set('Authorization', `Bearer ${customer2Token}`);
    expect(initRes.body.data.position).toBe(2);

    // Staff Calls Next
    const callRes = await request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${staffToken}`);
    expect(callRes.status).toBe(200);
    expect(callRes.body.data.status).toBe('CALLED');
    expect(callRes.body.data.calledAt).toBeDefined();
    expect(callRes.body.data.counterId).toBe(activeCounterId);
    
    const token1Id = callRes.body.data._id;

    // Verify queue positions remain correct (Cust 1 is CALLED so pos=1, Cust 2 is WAITING so pos=2 because Cust 1 is still ahead and active)
    const midRes = await request(app).get('/api/queues/my-active').set('Authorization', `Bearer ${customer2Token}`);
    expect(midRes.body.data.position).toBe(2);

    // Call Next again should fail because counter is busy
    const busyCallRes = await request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${staffToken}`);
    expect(busyCallRes.status).toBe(400);

    // Staff Starts Serving
    const startRes = await request(app).post(`/api/staff/queue/${token1Id}/start`).set('Authorization', `Bearer ${staffToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('SERVING');
    expect(startRes.body.data.servingStartedAt).toBeDefined();

    // Staff Completes
    const compRes = await request(app).post(`/api/staff/queue/${token1Id}/complete`).set('Authorization', `Bearer ${staffToken}`);
    expect(compRes.status).toBe(200);
    expect(compRes.body.data.status).toBe('COMPLETED');
    expect(compRes.body.data.completedAt).toBeDefined();

    // Verify queue positions (Cust 1 is COMPLETED, so Cust 2 is now pos 1)
    const finalRes = await request(app).get('/api/queues/my-active').set('Authorization', `Bearer ${customer2Token}`);
    expect(finalRes.body.data.position).toBe(1);

    // Check stats
    const statsRes = await request(app).get('/api/staff/queue').set('Authorization', `Bearer ${staffToken}`);
    expect(statsRes.body.data.stats.completed).toBe(1);
    expect(statsRes.body.data.stats.waiting).toBe(1);
  });

  it('15-16: Staff can skip WAITING and CALLED tokens', async () => {
    // Join 2 tokens
    const join1 = await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customerToken}`).send({ organizationId: activeOrgId, serviceId: activeServiceId });
    const join2 = await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customer2Token}`).send({ organizationId: activeOrgId, serviceId: activeServiceId });
    
    // Skip WAITING (token 2)
    const skipWaiting = await request(app).post(`/api/staff/queue/${join2.body.data._id}/skip`).set('Authorization', `Bearer ${staffToken}`);
    expect(skipWaiting.status).toBe(200);
    expect(skipWaiting.body.data.status).toBe('SKIPPED');

    // Call token 1
    const callRes = await request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${staffToken}`);
    expect(callRes.body.data._id).toBe(join1.body.data._id); // ensure it skips the skipped token

    // Skip CALLED
    const skipCalled = await request(app).post(`/api/staff/queue/${callRes.body.data._id}/skip`).set('Authorization', `Bearer ${staffToken}`);
    expect(skipCalled.status).toBe(200);
    expect(skipCalled.body.data.status).toBe('SKIPPED');
  });

  it('10: Invalid status transitions are rejected', async () => {
    // Customer joins
    const join = await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customerToken}`).send({ organizationId: activeOrgId, serviceId: activeServiceId });
    const tokenId = join.body.data._id;

    // WAITING -> COMPLETED is invalid (only SERVING -> COMPLETED allowed)
    const badComplete = await request(app).post(`/api/staff/queue/${tokenId}/complete`).set('Authorization', `Bearer ${staffToken}`);
    expect(badComplete.status).toBe(400);

    // WAITING -> SERVING is invalid (only CALLED -> SERVING)
    const badStart = await request(app).post(`/api/staff/queue/${tokenId}/start`).set('Authorization', `Bearer ${staffToken}`);
    expect(badStart.status).toBe(400);
  });

  it('11-13: Staff cannot operate another counter or organization service', async () => {
    // Customer joins Org 2, Service 2
    const join = await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customerToken}`).send({ organizationId: secondOrgId, serviceId: secondServiceId });
    const token2Id = join.body.data._id;

    // Staff 1 (Org 1, Counter 1) tries to skip Org 2's waiting token
    const res1 = await request(app).post(`/api/staff/queue/${token2Id}/skip`).set('Authorization', `Bearer ${staffToken}`);
    expect(res1.status).toBe(403);
    expect(res1.body.message).toContain('Token does not belong to your service');

    // Other Staff calls it
    const callRes = await request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${otherOrgStaffToken}`);
    expect(callRes.status).toBe(200);
    expect(callRes.body.data._id).toBe(token2Id);

    // Staff 1 tries to start the called token belonging to Other Staff's counter
    const res2 = await request(app).post(`/api/staff/queue/${token2Id}/start`).set('Authorization', `Bearer ${staffToken}`);
    expect(res2.status).toBe(403);
    expect(res2.body.message).toContain('not assigned to your counter');
  });

  it('17: Concurrent Call Next requests cannot claim the same token', async () => {
    // One token waiting
    await request(app).post('/api/queues/join').set('Authorization', `Bearer ${customerToken}`).send({ organizationId: secondOrgId, serviceId: secondServiceId });
    
    // We need 2 staff on same counter for concurrent test
    const staff2 = await User.create({
      fullName: 'Other Staff 2',
      email: 'other2@test.com',
      phone: '+15551110009',
      passwordHash: 'dummyhash',
      role: 'staff',
      organizationId: secondOrgId,
      counterId: secondCounterId,
      isActive: true,
    });
    const staff2Token = generateAccessToken({ userId: staff2._id.toString(), role: staff2.role });

    const [res1, res2] = await Promise.all([
      request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${otherOrgStaffToken}`),
      request(app).post('/api/staff/queue/call-next').set('Authorization', `Bearer ${staff2Token}`),
    ]);

    // One should succeed, the other should either get 400 (counter busy) or 404 (no more tokens) depending on execution order
    const statuses = [res1.status, res2.status].sort();
    expect(statuses[0]).toBe(200); // One got the token
    expect([400, 404]).toContain(statuses[1]); // The other failed
  });
});
