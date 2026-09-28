import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Service } from '../models/Service';
import { Counter } from '../models/Counter';
import { generateAccessToken } from '../utils/token';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

let customerToken: string;
let orgAdmin1Token: string;
let orgAdmin2Token: string;
let orgAdmin1Id: string;
let orgAdmin2Id: string;
let org1Id: string;
let org2Id: string;

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
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Organization.deleteMany({});
  await Service.deleteMany({});
  await Counter.deleteMany({});

  // Create Customer
  const customer = await User.create({
    fullName: 'Customer One',
    email: 'customer@test.com',
    phone: '+1234567890',
    passwordHash: 'dummy',
    role: 'customer',
    isActive: true,
  });
  customerToken = generateAccessToken({ userId: customer._id.toString(), role: customer.role });

  // Create Org Admin 1
  const admin1 = await User.create({
    fullName: 'Admin One',
    email: 'admin1@test.com',
    phone: '+1999999999',
    passwordHash: 'dummy',
    role: 'organization_admin',
    isActive: true,
  });
  orgAdmin1Id = admin1._id.toString();
  orgAdmin1Token = generateAccessToken({ userId: admin1._id.toString(), role: admin1.role });

  // Create Org Admin 2
  const admin2 = await User.create({
    fullName: 'Admin Two',
    email: 'admin2@test.com',
    phone: '+1888888888',
    passwordHash: 'dummy',
    role: 'organization_admin',
    isActive: true,
  });
  orgAdmin2Id = admin2._id.toString();
  orgAdmin2Token = generateAccessToken({ userId: admin2._id.toString(), role: admin2.role });

  // Create Org 1 owned by Org Admin 1
  const org1 = await Organization.create({
    name: 'Metropolitan Hospital',
    address: '123 Health Ave',
    phone: '+15550001',
    email: 'contact@metrohospital.org',
    category: 'Healthcare',
    ownerId: admin1._id,
    isActive: true,
  });
  org1Id = org1._id.toString();

  // Create Org 2 owned by Org Admin 2
  const org2 = await Organization.create({
    name: 'City Bank Central',
    address: '456 Finance St',
    phone: '+15550002',
    email: 'info@citybank.com',
    category: 'Banking',
    ownerId: admin2._id,
    isActive: true,
  });
  org2Id = org2._id.toString();
});

describe('Phase 2: Organization Management Tests', () => {
  it('should allow organization_admin to create an organization', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${orgAdmin1Token}`)
      .send({
        name: 'New Clinic Branch',
        address: '789 Medical Lane',
        phone: '+15550003',
        email: 'clinic@test.com',
        category: 'Healthcare',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Clinic Branch');
  });

  it('should reject organization modification by another organization_admin (cross-org check)', async () => {
    const res = await request(app)
      .put(`/api/organizations/${org1Id}`)
      .set('Authorization', `Bearer ${orgAdmin2Token}`)
      .send({
        name: 'Hacked Hospital Name',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  it('should reject customer creating an organization', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        name: 'Unauthorized Org',
        address: '123 Fake St',
        phone: '+10000000',
        email: 'fake@test.com',
        category: 'Other',
      });

    expect(res.status).toBe(403);
  });
});

describe('Phase 2: Service Management Tests', () => {
  it('should allow org admin to create a service under their organization', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${orgAdmin1Token}`)
      .send({
        organizationId: org1Id,
        name: 'General Consultation',
        estimatedServiceTime: 20,
        description: 'Primary doctor checkup',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('General Consultation');
  });

  it('should reject service creation under another org admin organization', async () => {
    const res = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${orgAdmin2Token}`)
      .send({
        organizationId: org1Id, // Org Admin 2 trying to add service to Org 1
        name: 'Malicious Service',
        estimatedServiceTime: 15,
      });

    expect(res.status).toBe(403);
  });

  it('should allow customer to read active services of an active organization', async () => {
    await Service.create({
      organizationId: org1Id,
      name: 'Blood Test Lab',
      estimatedServiceTime: 10,
      isActive: true,
    });

    const res = await request(app)
      .get(`/api/services?organizationId=${org1Id}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Blood Test Lab');
  });

  it('should prevent deleting service assigned to active counters (safe deletion)', async () => {
    const service = await Service.create({
      organizationId: org1Id,
      name: 'Pharmacy Service',
      estimatedServiceTime: 5,
      isActive: true,
    });

    await Counter.create({
      organizationId: org1Id,
      serviceId: service._id,
      name: 'Counter 1',
      isActive: true,
    });

    const res = await request(app)
      .delete(`/api/services/${service._id}`)
      .set('Authorization', `Bearer ${orgAdmin1Token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('active counters');
  });
});

describe('Phase 2: Counter & Staff Management Tests', () => {
  it('should allow org admin to create counter and associate with service', async () => {
    const service = await Service.create({
      organizationId: org1Id,
      name: 'Triage',
      estimatedServiceTime: 10,
    });

    const res = await request(app)
      .post('/api/counters')
      .set('Authorization', `Bearer ${orgAdmin1Token}`)
      .send({
        organizationId: org1Id,
        serviceId: service._id.toString(),
        name: 'Desk A',
        location: '1st Floor Room 101',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Desk A');
  });

  it('should allow org admin to create staff user and assign to counter', async () => {
    const counter = await Counter.create({
      organizationId: org1Id,
      name: 'Desk B',
      isActive: true,
    });

    const res = await request(app)
      .post('/api/staff')
      .set('Authorization', `Bearer ${orgAdmin1Token}`)
      .send({
        organizationId: org1Id,
        fullName: 'Staff Nurse Sarah',
        email: 'sarah.nurse@metrohospital.org',
        phone: '+15557777',
        password: 'Password123!',
        counterId: counter._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe('staff');
    expect(res.body.data.organizationId).toBe(org1Id);
    expect(res.body.data.counterId).toBe(counter._id.toString());
  });

  it('should reject staff assignment across different organizations', async () => {
    const staffUser = await User.create({
      fullName: 'Org2 Staff',
      email: 'staff2@bank.com',
      phone: '+15558888',
      passwordHash: 'dummy',
      role: 'staff',
      organizationId: org2Id,
      isActive: true,
    });

    const res = await request(app)
      .put(`/api/staff/${staffUser._id}/counter`)
      .set('Authorization', `Bearer ${orgAdmin1Token}`) // Org Admin 1 trying to assign Org 2 staff
      .send({
        counterId: null,
      });

    expect(res.status).toBe(403);
  });
});
