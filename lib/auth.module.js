export const AuthTemplates = {
    passport: `import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { UserRepo } from '../repositories/user.repository.js';
import dotenv from 'dotenv';
dotenv.config();

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'secret'
};

export const setupPassport = (passport) => {
    passport.use(new JwtStrategy(options, async (jwt_payload, done) => {
        try {
            const user = await UserRepo.getById(jwt_payload.id);
            if (user) return done(null, user);
            return done(null, false);
        } catch (err) {
            return done(err, false);
        }
    }));
};`,

    roleMiddleware: `export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};`
};
