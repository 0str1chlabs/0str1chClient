# Authentication System Setup Guide

This guide will help you set up the comprehensive authentication system with Google login, email-based login, password hashing, and email encryption.

## Features Implemented

- ✅ Email/Password authentication with password hashing
- ✅ Google OAuth integration
- ✅ Email encryption (client-side encryption before sending to server)
- ✅ JWT token management with refresh tokens
- ✅ Remember me functionality with Chrome session storage
- ✅ Hardcoded login for testing (password@123)
- ✅ Modern UI with login modal and user menu
- ✅ Real-time encryption and hashing

## Backend Setup

### 1. Install Dependencies

The backend dependencies have been added to the main `package.json`. Run:

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# JWT Secrets
JWT_SECRET=your-jwt-secret-key-very-long-and-secure
JWT_REFRESH_SECRET=your-refresh-secret-key-very-long-and-secure

# Email Encryption Keys
EMAIL_ENCRYPTION_KEY=your-secret-key-32-chars-long!!
EMAIL_ENCRYPTION_IV=your-iv-16-chars!

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Start the Backend Server

```bash
npm start
```

The server will run on `http://localhost:8090`

## Frontend Setup

### 1. Environment Variables

Create a `.env` file in the `sheet-scribe-ai-lab` directory:

```env
# Email Encryption Keys (must match backend)
REACT_APP_EMAIL_ENCRYPTION_KEY=your-secret-key-32-chars-long!!
REACT_APP_EMAIL_ENCRYPTION_IV=your-iv-16-chars!

# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id

# Backend API URL
REACT_APP_API_URL=http://localhost:8090
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set application type to "Web application"
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `http://localhost:3000` (if using different port)
7. Copy the Client ID and add it to your environment variables

### 3. Start the Frontend

```bash
cd sheet-scribe-ai-lab
npm run dev
```

## Usage

### 1. Login Options

The authentication system provides three login methods:

#### Email/Password Login
- Regular email and password authentication
- Passwords are hashed using bcrypt with 12 salt rounds
- Emails are encrypted before sending to server

#### Google OAuth Login
- One-click Google sign-in
- Automatically creates account if user doesn't exist
- Secure token verification

#### Quick Login (Hardcoded)
- For testing purposes
- Uses hardcoded password: `password@123`
- Just enter any email address

### 2. Security Features

#### Password Hashing
- All passwords are hashed using bcrypt with 12 salt rounds
- Server never stores plain text passwords
- Secure password verification

#### Email Encryption
- Emails are encrypted on the client-side before sending to server
- Server stores emails in encrypted format only
- Only the server has the decryption key
- Uses AES-256-CBC encryption

#### JWT Tokens
- Access tokens with configurable expiration (24h default, 30d with remember me)
- Refresh tokens for seamless authentication
- Automatic token refresh on API calls
- Secure token storage in localStorage

#### Session Management
- Remember me functionality extends session to 30 days
- Automatic session cleanup
- Secure logout with token invalidation

### 3. User Interface

#### Login Modal
- Modern, responsive design
- Tabbed interface for different login methods
- Real-time validation and error handling
- Loading states and success messages

#### User Menu
- Displays user name and email
- Avatar with user initials
- Logout functionality
- Integrated into the main application header

## API Endpoints

### Authentication Routes

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/hardcoded-login` - Quick login with hardcoded password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user (protected)

### Request/Response Examples

#### Signup
```json
POST /api/auth/signup
{
  "email": "encrypted-email-string",
  "password": "plain-text-password",
  "name": "User Name"
}
```

#### Login
```json
POST /api/auth/login
{
  "email": "encrypted-email-string",
  "password": "plain-text-password",
  "rememberMe": true
}
```

#### Response
```json
{
  "message": "Login successful",
  "token": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

## Security Considerations

1. **Environment Variables**: Never commit real encryption keys to version control
2. **HTTPS**: Use HTTPS in production for secure communication
3. **Token Storage**: Tokens are stored in localStorage (consider httpOnly cookies for production)
4. **Password Policy**: Implement password strength requirements in production
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **CORS**: Configure CORS properly for production domains

## Database Integration

The current implementation uses in-memory storage. To integrate with a real database:

1. Replace the `users` array in `AIServer/LoginAuth/auth.ts`
2. Replace the `sessions` Map with database tables
3. Add proper database connection and error handling
4. Implement user management features (password reset, email verification, etc.)

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend CORS is configured for frontend domain
2. **Google OAuth Not Working**: Check Google Client ID and authorized origins
3. **Encryption Errors**: Verify encryption keys match between frontend and backend
4. **Token Expired**: Check JWT secret and expiration settings

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

## Production Deployment

1. Use strong, unique encryption keys
2. Enable HTTPS
3. Set up proper CORS configuration
4. Use environment-specific Google OAuth credentials
5. Implement proper error logging and monitoring
6. Add rate limiting and security headers
7. Consider using httpOnly cookies for token storage 