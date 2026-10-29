'use strict';
const passport = require('passport');

const authenticate = passport.authenticate('jwt', { session: false });

const requireAdmin = [
  authenticate,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
    }
    next();
  },
];

module.exports = { authenticate, requireAdmin };
