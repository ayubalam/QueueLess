import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { QueueToken } from '../models/QueueToken';
import { QueueSequence } from '../models/QueueSequence';
import { generateAccessToken } from '../utils/token';
import { getTodayDateString } from '../services/queueEngine';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

let customer1Token: string;
let customer2Token: string;
let customer3Token: string;
let orgAdminToken: string;

let customer1Id: string;
let customer2Id: string;
let customer3Id: string;

let activeOrgId: string;
let inactiveOrgId: string;
let activeServiceId: string;
let inactiveServiceId: string;
let unrelatedServiceId: string;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Service.deleteMany({});
  await QueueToken.deleteMany({});
  await QueueSequence.deleteMany({});
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Service.deleteMany({});
  await QueueToken.deleteMany({});
  await QueueSequence.deleteMany({});

  // 1. Create Customers
  const cust1 = await User.create({
    fullName: 'Alice Customer',
    email: 'alice@test.com',
    phone: '+15551110001',
    passwordHash: 'dummyhash',
    role: 'customer',
    isActive: true,
  });
  customer1Id = cust1._id.toString();
  customer1Token = generateAccessToken({ userId: customer1Id, role: cust1.role });

  const cust2 = await User.create({
    fullName: 'Bob Customer',
    email: 'bob@test.com',
    phone: '+15551110002',
    passwordHash: 'dummyhash',
    role: 'customer',
    isActive: true,
  });
  customer2Id = cust2._id.toString();
  customer2Token = generateAccessToken({ userId: customer2Id, role: cust2.role });

  const cust3 = await User.create({
    fullName: 'Charlie Customer',
    email: 'charlie@test.com',
    phone: '+15551110003',
    passwordHash: 'dummyhash',
    role: 'customer',
    isActive: true,
  });
  customer3Id = cust3._id.toString();
  customer3Token = generateAccessToken({ userId: customer3Id, role: cust3.role });

  // 2. Create Org Admin
  const admin = await User.create({
    fullName: 'Admin User',
    email: 'admin@test.com',
    phone: '+15559990000',
    passwordHash: 'dummyhash',
    role: 'organization_admin',
    isActive: true,
  });
  orgAdminToken = generateAccessToken({ userId: admin._id.toString(), role: admin.role });

  // 3. Create Organizations
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

  const inactiveOrg = await Organization.create({
    name: 'Closed Clinic',
    address: '200 Old Road',
    phone: '+15552000002',
    email: 'info@closed.org',
    category: 'Healthcare',
    ownerId: admin._id,
    isActive: false,
  });
  inactiveOrgId = inactiveOrg._id.toString();

  const secondOrg = await Organization.create({
    name: 'Separate Org',
    address: '300 Other Ave',
    phone: '+15552000003',
    email: 'info@separate.org',
    category: 'Finance',
    ownerId: admin._id,
    isActive: true,
  });

  // 4. Create Services
  const activeService = await Service.create({
    organizationId: activeOrg._id,
    name: 'General Consultation',
    description: 'General doctor consultation',
    estimatedServiceTime: 15,
    isActive: true,
  });
  activeServiceId = activeService._id.toString();

  const inactiveService = await Service.create({
    organizationId: activeOrg._id,
    name: 'Specialist Consultation',
    estimatedServiceTime: 30,
    isActive: false,
  });
  inactiveServiceId = inactiveService._id.toString();

  const unrelatedService = await Service.create({
    organizationId: secondOrg._id,
    name: 'Cash Counter',
    estimatedServiceTime: 10,
    isActive: true,
  });
  unrelatedServiceId = unrelatedService._id.toString();
});

describe('Phase 3: Queue Engine & Token Management Tests', () => {
  // Requirement 1 & 2 & 14: Customer joins active service and receives token with WAITING status
  it('1 & 2 & 14: should allow customer to join active service queue and generate a WAITING token', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokenNumber).toBe(1);
    expect(res.body.data.tokenCode).toBe('A001');
    expect(res.body.data.status).toBe('WAITING');
    expect(res.body.data.position).toBe(1);
    expect(res.body.data.peopleAhead).toBe(0);
    expect(res.body.data.estimatedWaitMinutes).toBe(0);
  });

  // Requirement 3: First customer receives correct position
  it('3: first customer receives position 1 and 0 people ahead', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.position).toBe(1);
    expect(res.body.data.peopleAhead).toBe(0);
  });

  // Requirement 4 & 5 & 6: Second customer receives next token, correct position, peopleAhead, and estimatedWaitMinutes
  it('4 & 5 & 6: second customer receives next token number, position 2, 1 person ahead, and wait time', async () => {
    // Customer 1 joins first
    await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    // Customer 2 joins second
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.tokenNumber).toBe(2);
    expect(res.body.data.tokenCode).toBe('A002');
    expect(res.body.data.position).toBe(2);
    expect(res.body.data.peopleAhead).toBe(1);
    // estimatedServiceTime is 15 mins -> 1 * 15 = 15
    expect(res.body.data.estimatedWaitMinutes).toBe(15);
  });

  // Requirement 7: Customer cannot join the same service twice while active
  it('7: customer cannot join the same service twice while having an active token', async () => {
    // Customer 1 joins first time
    const res1 = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });
    expect(res1.status).toBe(201);

    // Customer 1 tries joining same service again
    const res2 = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });
    expect(res2.status).toBe(400);
    expect(res2.body.message).toContain('already have an active queue token');
  });

  // Requirement 8: Customer can cancel a waiting token
  it('8: customer can cancel their waiting token', async () => {
    const joinRes = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    const tokenId = joinRes.body.data._id;

    const cancelRes = await request(app)
      .post(`/api/queues/${tokenId}/cancel`)
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancelledAt).toBeDefined();
  });

  // Requirement 9: Cancelled token does not count toward queue position of later customers
  it('9: cancelled token does not count toward queue position of remaining customers', async () => {
    // Customer 1 joins
    const join1 = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ organizationId: activeOrgId, serviceId: activeServiceId });
    const token1Id = join1.body.data._id;

    // Customer 2 joins (position 2)
    const join2 = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer2Token}`)
      .send({ organizationId: activeOrgId, serviceId: activeServiceId });
    expect(join2.body.data.position).toBe(2);

    // Customer 1 cancels their token
    await request(app)
      .post(`/api/queues/${token1Id}/cancel`)
      .set('Authorization', `Bearer ${customer1Token}`);

    // Check Customer 2's active token: position should now advance to 1 (0 people ahead)
    const activeRes = await request(app)
      .get('/api/queues/my-active')
      .set('Authorization', `Bearer ${customer2Token}`);

    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data.position).toBe(1);
    expect(activeRes.body.data.peopleAhead).toBe(0);
    expect(activeRes.body.data.estimatedWaitMinutes).toBe(0);
  });

  // Requirement 10: Customer cannot access or cancel another customer's token
  it('10: customer cannot access or cancel another customer token', async () => {
    const joinRes = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ organizationId: activeOrgId, serviceId: activeServiceId });
    const token1Id = joinRes.body.data._id;

    // Customer 2 tries to GET customer 1's token
    const viewRes = await request(app)
      .get(`/api/queues/${token1Id}`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(viewRes.status).toBe(403);
    expect(viewRes.body.message).toContain('Access denied');

    // Customer 2 tries to CANCEL customer 1's token
    const cancelRes = await request(app)
      .post(`/api/queues/${token1Id}/cancel`)
      .set('Authorization', `Bearer ${customer2Token}`);
    expect(cancelRes.status).toBe(403);
    expect(cancelRes.body.message).toContain('Access denied');
  });

  // Requirement 11: Customer cannot join inactive organization
  it('11: customer cannot join an inactive organization', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: inactiveOrgId,
        serviceId: activeServiceId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Organization is currently inactive');
  });

  // Requirement 12: Customer cannot join inactive service
  it('12: customer cannot join an inactive service', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: inactiveServiceId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Service is currently inactive');
  });

  // Requirement 13: Service must belong to selected organization
  it('13: service must belong to the selected organization', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({
        organizationId: activeOrgId,
        serviceId: unrelatedServiceId, // belongs to secondOrg
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('does not belong to this organization');
  });

  // Requirement 15: Token uniqueness constraint in database
  it('15: database prevents duplicate token numbers for the same service and date', async () => {
    const today = getTodayDateString();

    await QueueToken.create({
      organizationId: activeOrgId,
      serviceId: activeServiceId,
      customerId: customer1Id,
      tokenNumber: 99,
      tokenCode: 'G099',
      queueDate: today,
      status: 'WAITING',
      estimatedWaitMinutes: 0,
    });

    // Trying to insert an identical tokenNumber for the same service and date must fail
    await expect(
      QueueToken.create({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
        customerId: customer2Id,
        tokenNumber: 99,
        tokenCode: 'G099',
        queueDate: today,
        status: 'WAITING',
        estimatedWaitMinutes: 0,
      })
    ).rejects.toThrow();
  });

  // Requirement 16: Concurrent queue joining does not create duplicate token numbers
  it('16: concurrent queue joins receive distinct and unique sequential token numbers', async () => {
    // Launch 3 requests concurrently
    const [res1, res2, res3] = await Promise.all([
      request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ organizationId: activeOrgId, serviceId: activeServiceId }),
      request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${customer2Token}`)
        .send({ organizationId: activeOrgId, serviceId: activeServiceId }),
      request(app)
        .post('/api/queues/join')
        .set('Authorization', `Bearer ${customer3Token}`)
        .send({ organizationId: activeOrgId, serviceId: activeServiceId }),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res3.status).toBe(201);

    const tokenNumbers = [
      res1.body.data.tokenNumber,
      res2.body.data.tokenNumber,
      res3.body.data.tokenNumber,
    ];

    // All token numbers must be distinct
    const uniqueNumbers = new Set(tokenNumbers);
    expect(uniqueNumbers.size).toBe(3);
    expect(tokenNumbers.sort()).toEqual([1, 2, 3]);

    const tokenCodes = [
      res1.body.data.tokenCode,
      res2.body.data.tokenCode,
      res3.body.data.tokenCode,
    ];
    expect(new Set(tokenCodes).size).toBe(3);
  });

  // Requirement 17: Queue history returns completed and cancelled records correctly
  it('17: queue history returns past and current records with full details', async () => {
    // Customer 1 joins and cancels
    const joinRes = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${customer1Token}`)
      .send({ organizationId: activeOrgId, serviceId: activeServiceId });

    await request(app)
      .post(`/api/queues/${joinRes.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${customer1Token}`);

    const historyRes = await request(app)
      .get('/api/queues/my-history')
      .set('Authorization', `Bearer ${customer1Token}`);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
    expect(historyRes.body.data.length).toBe(1);
    expect(historyRes.body.data[0].status).toBe('CANCELLED');
    expect(historyRes.body.data[0].organizationId.name).toBe('General Clinic');
    expect(historyRes.body.data[0].serviceId.name).toBe('General Consultation');
  });

  // Role authorization test
  it('non-customer cannot join queue', async () => {
    const res = await request(app)
      .post('/api/queues/join')
      .set('Authorization', `Bearer ${orgAdminToken}`)
      .send({
        organizationId: activeOrgId,
        serviceId: activeServiceId,
      });

    expect(res.status).toBe(403);
  });
});
