import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT, 10) || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'https://coverai-platform.vercel.app',
}));

export const dbConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME || 'neondb',
}));

export const jwtConfig = registerAs('jwt', () => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production');
    }
  }
  return {
    secret: process.env.JWT_SECRET || 'dev_only_secret_not_for_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_refresh_secret_not_for_production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  };
});

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
}));

export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3Bucket: process.env.AWS_S3_BUCKET || 'coverai-documents',
}));

export const paystackConfig = registerAs('paystack', () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  baseUrl: 'https://api.paystack.co',
}));

export const openaiConfig = registerAs('openai', () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
}));

export const resendConfig = registerAs('resend', () => ({
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.RESEND_FROM || 'CoverAI <onboarding@resend.dev>',
}));

export const twilioConfig = registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
}));
