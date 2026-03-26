const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wertech_db';

const PASSWORD_HASH_PREFIX = 'pbkdf2_sha512';
const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 64;
const PASSWORD_DIGEST = 'sha512';

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(String(plainPassword), salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString('hex');
  return `${PASSWORD_HASH_PREFIX}$${PASSWORD_ITERATIONS}$${salt}$${derived}`;
}

function normalizeStringArray(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

function normalizeDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const TxSchema = new mongoose.Schema({}, { strict: false, collection: 'transactions' });
const User = mongoose.model('users_backfill', UserSchema);
const Transaction = mongoose.model('transactions_backfill', TxSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);

  const users = await User.find({}).lean();
  const updates = [];
  let passwordMigrated = 0;
  let wtkInitialized = 0;

  for (const user of users) {
    const setOps = {};
    let changed = false;

    const username = String(user.username || '').trim();
    if (!username) continue;

    if (String(user.role || '').trim() === '') {
      setOps.role = 'user';
      changed = true;
    }
    if (String(user.status || '').trim() === '') {
      setOps.status = 'Verified';
      changed = true;
    }

    const accountState = String(user.account_state || '').toUpperCase();
    if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE', 'BANNED'].includes(accountState)) {
      setOps.account_state = 'ACTIVE';
      changed = true;
    }

    if (String(user.location || '').trim() === '') {
      setOps.location = 'Kalamassery, Kochi';
      changed = true;
    }

    const normalizedSkills = normalizeStringArray(user.skills, ['Web Design', 'Gardening', 'Plumbing']);
    const existingSkills = Array.isArray(user.skills) ? user.skills : [];
    if (existingSkills.length !== normalizedSkills.length || JSON.stringify(existingSkills) !== JSON.stringify(normalizedSkills)) {
      setOps.skills = normalizedSkills.length ? normalizedSkills : ['Web Design', 'Gardening', 'Plumbing'];
      changed = true;
    }

    const parsedRadius = Number(user.radius);
    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
      setOps.radius = 15;
      changed = true;
    }

    if (!['public', 'private'].includes(String(user.profile_visibility || ''))) {
      setOps.profile_visibility = 'public';
      changed = true;
    }

    const fieldsWithArrays = [
      'friends',
      'incoming_friend_requests',
      'outgoing_friend_requests',
      'dm_approved_users',
      'blocked_users'
    ];
    for (const field of fieldsWithArrays) {
      const normalized = normalizeStringArray(user[field], []);
      const existing = Array.isArray(user[field]) ? user[field] : [];
      if (existing.length !== normalized.length || JSON.stringify(existing) !== JSON.stringify(normalized)) {
        setOps[field] = normalized;
        changed = true;
      }
    }

    if (typeof user.has_subscribed !== 'boolean') {
      setOps.has_subscribed = true;
      changed = true;
    }
    if (!Number.isFinite(Number(user.subscription_paid))) {
      setOps.subscription_paid = 0;
      changed = true;
    }

    if (!user.created_at || Number.isNaN(new Date(user.created_at).getTime())) {
      setOps.created_at = new Date();
      changed = true;
    }

    if (typeof user.refresh_token_hash !== 'string') {
      setOps.refresh_token_hash = '';
      changed = true;
    }
    if (user.refresh_token_expires_at) {
      const parsed = normalizeDateOrNull(user.refresh_token_expires_at);
      if (!parsed) {
        setOps.refresh_token_expires_at = null;
        changed = true;
      }
    }

    const password = String(user.password || '');
    if (password && !password.startsWith(`${PASSWORD_HASH_PREFIX}$`)) {
      setOps.password = hashPassword(password);
      changed = true;
      passwordMigrated += 1;
    }

    const wtkBalance = Number(user.wtk_balance);
    if (!Number.isFinite(wtkBalance)) {
      setOps.wtk_balance = 1000;
      changed = true;
      wtkInitialized += 1;
    } else if (wtkBalance <= 0) {
      const txCount = await Transaction.countDocuments({ username });
      if (txCount === 0) {
        setOps.wtk_balance = 1000;
        changed = true;
        wtkInitialized += 1;
      }
    }

    if (user.username_last_changed_at && !normalizeDateOrNull(user.username_last_changed_at)) {
      setOps.username_last_changed_at = null;
      changed = true;
    }
    if (user.email_last_changed_at && !normalizeDateOrNull(user.email_last_changed_at)) {
      setOps.email_last_changed_at = null;
      changed = true;
    }

    if (changed) {
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: setOps }
        }
      });
    }
  }

  if (updates.length > 0) {
    await User.bulkWrite(updates, { ordered: false });
  }

  console.log('User backfill completed');
  console.log(`Users scanned: ${users.length}`);
  console.log(`Users updated: ${updates.length}`);
  console.log(`Passwords migrated: ${passwordMigrated}`);
  console.log(`WTK balances initialized: ${wtkInitialized}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('Backfill failed:', err);
  try {
    await mongoose.disconnect();
  } catch (disconnectErr) {
    // no-op
  }
  process.exit(1);
});
