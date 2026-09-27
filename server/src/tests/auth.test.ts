import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';

const TEST_MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/queueless_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await RefreshToken.deleteMany({});
});

describe('Authentication API Tests', () => {
  const validCustomer = {
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '+15551234567',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new customer account successfully', async () => {
      const res = await request(app).post('/api/auth/register').send(validCustomer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validCustomer.email.toLowerCase());
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with duplicate email', async () => {
      await request(app).post('/api/auth/register').send(validCustomer);

      const res = await request(app).post('/api/auth/register').send(validCustomer);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject weak password missing special character', async () => {
      const weak = { ...validCustomer, password: 'Password123', confirmPassword: 'Password123' };
      const res = await request(app).post('/api/auth/register').send(weak);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-matching password confirmation', async () => {
      const mismatch = { ...validCustomer, confirmPassword: 'DifferentPassword123!' };
      const res = await request(app).post('/api/auth/register').send(mismatch);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validCustomer);
    });

    it('should login successfully with valid credentials and return access token & refresh cookie', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: validCustomer.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validCustomer.email.toLowerCase());

      const cookies = res.get('Set-Cookie') || [];
      expect(cookies.some((c: string) => c.includes('refreshToken='))).toBe(true);
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for inactive account', async () => {
      await User.updateOne({ email: validCustomer.email.toLowerCase() }, { isActive: false });

      const res = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: validCustomer.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me & Refresh Flow', () => {
    it('should return current user with valid Bearer token', async () => {
      await request(app).post('/api/auth/register').send(validCustomer);
      const loginRes = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: validCustomer.password,
      });

      const token = loginRes.body.data.accessToken;

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(validCustomer.email.toLowerCase());
    });

    it('should refresh access token using HTTP-only refresh cookie', async () => {
      await request(app).post('/api/auth/register').send(validCustomer);
      const loginRes = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: validCustomer.password,
      });

      const refreshCookie = loginRes.get('Set-Cookie') || [];

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('Password Reset Flow', () => {
    it('should generate forgot-password token and reset password', async () => {
      await request(app).post('/api/auth/register').send(validCustomer);

      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validCustomer.email });

      expect(forgotRes.status).toBe(200);
      const devToken = forgotRes.body.data.devResetToken;
      expect(devToken).toBeDefined();

      const resetRes = await request(app).post('/api/auth/reset-password').send({
        token: devToken,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      expect(resetRes.status).toBe(200);

      // Verify login with new password
      const newLoginRes = await request(app).post('/api/auth/login').send({
        email: validCustomer.email,
        password: 'NewPassword123!',
      });

      expect(newLoginRes.status).toBe(200);
    });
  });
});
