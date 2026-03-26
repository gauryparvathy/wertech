const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const crypto = require('crypto');

jest.setTimeout(60000);

let mongoServer;
let app;
let connectDatabase;
let models;

async function registerUser({ username, email, password, referred_by } = {}) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password, referred_by });
  expect(response.status).toBe(201);
  return response.body;
}

async function loginUser({ email, password }) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  expect(response.status).toBe(200);
  return response.body;
}

describe('API integration: auth, transactions, chat, moderation, reports', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'test_secret_for_jwt';
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    process.env.PORT = '0';
    process.env.NODE_ENV = 'test';
    process.env.WTK_PRICE_INR = '10';
    process.env.WTK_MIN_PURCHASE = '1';
    process.env.WTK_MAX_PURCHASE = '20';
    process.env.DEVELOPER_UPI_ID = 'dev@upi';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = 'rzp_test_webhook_secret';
    process.env.RAZORPAYX_SOURCE_ACCOUNT_NUMBER = '1234567890';

    // Require after env setup so server picks test config.
    // eslint-disable-next-line global-require
    const serverModule = require('../server');
    app = serverModule.app;
    connectDatabase = serverModule.connectDatabase;
    models = serverModule.models;

    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  test('auth flow: register/login/me/refresh and protected endpoint guard', async () => {
    await registerUser({
      username: 'alice',
      email: 'alice@example.com',
      password: 'password123'
    });

    const login = await loginUser({
      email: 'alice@example.com',
      password: 'password123'
    });

    expect(login.access_token).toBeTruthy();
    expect(login.refresh_token).toBeTruthy();
    expect(login.username).toBe('alice');
    expect(login.wtk_balance).toBe(500);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.access_token}`);
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('alice');
    expect(me.body.wtk_balance).toBe(500);

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: login.refresh_token });
    expect(refresh.status).toBe(200);
    expect(refresh.body.access_token).toBeTruthy();
    expect(refresh.body.refresh_token).toBeTruthy();

    const protectedNoToken = await request(app).get('/api/users');
    expect(protectedNoToken.status).toBe(401);
    expect(protectedNoToken.body).toEqual(
      expect.objectContaining({
        code: 'UNAUTHORIZED',
        message: expect.any(String)
      })
    );
  });

  test('transactions flow: spend WTK creates sender+receiver records', async () => {
    await registerUser({
      username: 'bob',
      email: 'bob@example.com',
      password: 'password123'
    });

    const aliceLogin = await loginUser({
      email: 'alice@example.com',
      password: 'password123'
    });

    const tx = await request(app)
      .post('/api/transactions/apply')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`)
      .send({
        username: 'alice',
        type: 'spent',
        title: 'WTK transfer',
        selectedUser: 'bob',
        wtk: 50
      });

    expect(tx.status).toBe(201);
    expect(tx.body.message).toMatch(/WTK sent/i);

    const aliceTx = await request(app)
      .get('/api/transactions/user/alice')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`);
    expect(aliceTx.status).toBe(200);
    expect(Array.isArray(aliceTx.body)).toBe(true);
    expect(aliceTx.body.some((r) => r.type === 'spent')).toBe(true);
  });

  test('referral + profile completion + provider purchase webhook flow credits balances correctly', async () => {
    await registerUser({
      username: 'carol',
      email: 'carol@example.com',
      password: 'password123',
      referred_by: 'alice'
    });

    const aliceLogin = await loginUser({
      email: 'alice@example.com',
      password: 'password123'
    });
    const carolLogin = await loginUser({
      email: 'carol@example.com',
      password: 'password123'
    });

    expect(carolLogin.wtk_balance).toBe(500);

    const aliceWalletAfterReferralSignup = await request(app)
      .get('/api/users/alice/wallet')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`);
    expect(aliceWalletAfterReferralSignup.status).toBe(200);
    expect(aliceWalletAfterReferralSignup.body.wtk_balance).toBe(1050);

    const completeProfile = await request(app)
      .patch('/api/users/carol/profile')
      .set('Authorization', `Bearer ${carolLogin.access_token}`)
      .send({
        username: 'carol',
        email: 'carol@example.com',
        location: 'Kochi',
        skills: ['Design'],
        radius: 20
      });
    expect(completeProfile.status).toBe(200);
    expect(completeProfile.body.profile_bonus_awarded).toBe(true);
    expect(completeProfile.body.wtk_balance).toBe(1000);

    const aliceWalletAfterProfile = await request(app)
      .get('/api/users/alice/wallet')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`);
    expect(aliceWalletAfterProfile.status).toBe(200);
    expect(aliceWalletAfterProfile.body.wtk_balance).toBe(1150);

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'plink_test_123',
        short_url: 'https://rzp.io/i/test123',
        reference_id: 'wtk_buy_test_ref',
        notes: {
          username: 'carol',
          requested_wtk: '10',
          developer_upi_id: 'dev@upi'
        }
      })
    });

    const buyIntent = await request(app)
      .post('/api/users/carol/wallet/purchase-intent')
      .set('Authorization', `Bearer ${carolLogin.access_token}`)
      .send({ wtk: 10 });

    expect(buyIntent.status).toBe(201);
    expect(buyIntent.body.paid_inr).toBe(100);
    expect(buyIntent.body.payment_url).toBe('https://rzp.io/i/test123');

    global.fetch = originalFetch;

    const webhookBody = {
      event: 'payment_link.paid',
      payload: {
        payment_link: {
          entity: {
            id: 'plink_test_123'
          }
        },
        payment: {
          entity: {
            id: 'pay_test_123'
          }
        }
      }
    };
    const rawWebhookBody = JSON.stringify(webhookBody);
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawWebhookBody)
      .digest('hex');

    const webhookResponse = await request(app)
      .post('/api/payments/razorpay/webhook')
      .set('x-razorpay-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawWebhookBody);

    expect(webhookResponse.status).toBe(200);

    const carolWalletAfterPurchase = await request(app)
      .get('/api/users/carol/wallet')
      .set('Authorization', `Bearer ${carolLogin.access_token}`);
    expect(carolWalletAfterPurchase.status).toBe(200);
    expect(carolWalletAfterPurchase.body.wtk_balance).toBe(1010);
  });

  test('chat flow: create message and enforce sender-only delete', async () => {
    const aliceLogin = await loginUser({
      email: 'alice@example.com',
      password: 'password123'
    });
    const bobLogin = await loginUser({
      email: 'bob@example.com',
      password: 'password123'
    });

    const sent = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`)
      .send({
        sender_username: 'alice',
        receiver_username: 'bob',
        text: 'hello bob'
      });
    expect(sent.status).toBe(201);
    const messageId = String(sent.body._id);

    const bobDeleteAttempt = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${bobLogin.access_token}`)
      .send({});
    expect(bobDeleteAttempt.status).toBe(403);

    const aliceDelete = await request(app)
      .delete(`/api/messages/${messageId}`)
      .set('Authorization', `Bearer ${aliceLogin.access_token}`)
      .send({});
    expect(aliceDelete.status).toBe(200);
  });

  test('reports + moderation flow: user report and admin status update', async () => {
    await registerUser({
      username: 'admin1',
      email: 'admin1@example.com',
      password: 'password123'
    });
    await models.User.updateOne({ username: 'admin1' }, { $set: { role: 'admin' } });

    const aliceLogin = await loginUser({
      email: 'alice@example.com',
      password: 'password123'
    });
    const adminLogin = await loginUser({
      email: 'admin1@example.com',
      password: 'password123'
    });

    const report = await request(app)
      .post('/api/reports/user')
      .set('Authorization', `Bearer ${aliceLogin.access_token}`)
      .send({
        reporter_username: 'alice',
        reported_username: 'bob',
        reason: 'spam',
        details: 'test report'
      });
    expect(report.status).toBe(201);
    const reportId = String(report.body.report._id);

    const listReports = await request(app)
      .get('/api/admin/reports?status=open')
      .set('Authorization', `Bearer ${adminLogin.access_token}`);
    expect(listReports.status).toBe(200);
    expect(Array.isArray(listReports.body)).toBe(true);
    expect(listReports.body.some((r) => String(r._id) === reportId)).toBe(true);

    const updateStatus = await request(app)
      .patch(`/api/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminLogin.access_token}`)
      .send({ status: 'reviewed' });
    expect(updateStatus.status).toBe(200);
    expect(updateStatus.body.report.status).toBe('reviewed');
  });
});
