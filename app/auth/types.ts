export interface FormData {
  email: string;
  password: string;
  name: string;
  adminCode: string;
  userCode: string;
}

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_MIN_LENGTH = 6;
export const NAME_MIN_LENGTH = 2;

// Use environment variables for secrets
export const ADMIN_SECRET = process.env.AUTH_ADMIN_SECRET || '';
export const USER_SECRET = process.env.AUTH_USER_SECRET || '';