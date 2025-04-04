import jwt, { JwtPayload } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';

// Extend the Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '7d';

interface User {
  id: string;
  email: string;
  role: string;
}

interface DecodedToken extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token for a user
 * @param user - User object
 * @returns JWT token
 */
export function generateToken(user: User): string {
  const payload: DecodedToken = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token
 * @param token - JWT token
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    return null;
  }
}

/**
 * Hash a password
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

/**
 * Compare a password with a hash
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns True if password matches
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

/**
 * Middleware to authenticate requests
 * @param req - Request object
 * @param res - Response object
 * @param next - Next function
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader ? authHeader.split(' ')[1] : null;
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
    }

    if (decoded) {
      req.user = decoded;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to authorize requests based on user role
 * @param roles - Allowed roles
 * @returns Middleware function
 */
export function authorize(roles: string[] = []): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
    }

    if (roles.length && (!req.user || !roles.includes(req.user.role))) {
      res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

export default {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticate,
  authorize,
};