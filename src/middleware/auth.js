// Role-based access control (SRS FR-08).
// Demo login: Staff/Admin log in with a PIN and get a token. The token
// is kept in memory on the server (it is lost on restart — log in again).
// Every staff/admin route checks the token and the role.
// Campus Users need no login for public search, reporting and claims.
const crypto = require('crypto');

// token -> { accountId, name, role }
const sessions = new Map();

function createSession(account) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    accountId: String(account._id),
    name: account.name,
    role: account.role
  });
  return token;
}

function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const session = token && sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Please log in as Staff or Admin first.' });
  }
  req.user = session;
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Please log in first.' });
    }
    // Admin can do everything Staff can do.
    if (req.user.role === 'Admin') return next();
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    return next();
  };
}

const requireStaff = [requireLogin, requireRole('Staff')];
const requireAdmin = [requireLogin, requireRole('Admin')];

module.exports = { createSession, requireLogin, requireRole, requireStaff, requireAdmin };
