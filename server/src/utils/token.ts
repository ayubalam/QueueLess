import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  role: string;
  jti?: string;
}

export const getAccessSecret = (): string => {
  return process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_queueless_key_2026';
};

export const getRefreshSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_queueless_key_2026';
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: (process.env.ACCESS_TOKEN_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'],
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, jti: crypto.randomUUID() },
    getRefreshSecret(),
    {
      expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
    }
  );
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, getAccessSecret()) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, getRefreshSecret()) as TokenPayload;
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
