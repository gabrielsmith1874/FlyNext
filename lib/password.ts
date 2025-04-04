import { hash, compare } from 'bcryptjs';

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
 * @returns True if the password matches, false otherwise
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export default {
  hashPassword,
  comparePassword,
};