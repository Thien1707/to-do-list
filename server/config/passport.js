'use strict';
require('dotenv').config();
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { User } = require('../models');
const { getCachedUser, setCachedUser } = require('./authUserCache');

const JWT_USER_ATTRS = ['id', 'role', 'email', 'is_active', 'name', 'avatar_url'];

// JWT Strategy — cache user ngắn hạn để tránh 1 query MySQL (Aiven) mỗi API call
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me',
    },
    async (payload, done) => {
      try {
        const cached = getCachedUser(payload.id);
        if (cached) {
          if (!cached.is_active) return done(null, false);
          return done(null, cached);
        }

        const user = await User.findByPk(payload.id, { attributes: JWT_USER_ATTRS });
        if (!user || !user.is_active) return done(null, false);
        setCachedUser(user);
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

// Google OAuth Strategy (optional — skip when credentials are not configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          let user = await User.findOne({ where: { google_id: profile.id } });

          if (!user) {
            user = await User.findOne({ where: { email } });
            if (user) {
              await user.update({ google_id: profile.id, avatar_url: profile.photos[0]?.value });
            } else {
              user = await User.create({
                name: profile.displayName,
                email,
                google_id: profile.id,
                avatar_url: profile.photos[0]?.value,
                role: 'user',
                is_active: true,
              });
            }
          }

          if (!user.is_active) return done(null, false, { message: 'Account disabled' });
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );
}

module.exports = passport;
