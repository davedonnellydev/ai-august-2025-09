export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

export const GMAIL_REDIRECT_URI =
  process.env.GMAIL_REDIRECT_URI ||
  'http://localhost:3000/api/oauth/gmail/callback';
