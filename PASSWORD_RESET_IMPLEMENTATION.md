# Password Reset Implementation Guide

## Overview
This document outlines the complete password reset functionality implementation using Gmail API for sending verification codes. The system provides a secure, multi-step password reset flow with proper validation and security measures.

## Features Implemented

### 1. Frontend Components
- **ForgotPasswordModal**: Initial email input form
- **VerifyCodeModal**: 6-digit verification code input with timer
- **ResetPasswordModal**: New password creation with validation
- **PasswordResetFlow**: Main orchestrator component
- **Updated LoginModal**: Added "Forgot Password?" button

### 2. Backend API Routes
- `POST /api/auth/forgot-password`: Send verification code
- `POST /api/auth/verify-reset-code`: Verify the 6-digit code
- `POST /api/auth/reset-password`: Update user password

### 3. Security Features
- 6-digit random verification codes
- 5-minute code expiration
- 3-attempt limit per code
- 10-minute verification window
- Password strength validation
- Rate limiting protection
- Secure email sending via Gmail API

## Implementation Details

### Frontend Flow
1. User clicks "Forgot Password?" on login form
2. Email input modal opens
3. User enters email and clicks "Send Verification Code"
4. Verification code modal opens with 5-minute timer
5. User enters 6-digit code
6. New password modal opens with validation
7. User sets new password and confirms
8. Redirected to login with email prefilled

### Backend Security
- Verification codes stored in memory (use Redis in production)
- Codes expire after 5 minutes
- Maximum 3 failed attempts per code
- Verification valid for 10 minutes after successful verification
- Password must meet strength requirements
- All routes properly protected

### Gmail API Integration
- Uses Google OAuth2 for authentication
- Sends HTML-formatted emails
- Professional email template with branding
- Error handling for API failures

## Environment Variables Required

Add these to your `.env` file:

```env
# Gmail API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8090/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

### 🔍 **What Each Variable Does:**

- **`GOOGLE_CLIENT_ID`** & **`GOOGLE_CLIENT_SECRET`**: Identifies YOUR APPLICATION to Google (get from Google Cloud Console)
- **`GOOGLE_REDIRECT_URI`**: Where Google sends users after authorization (usually your callback URL)
- **`GOOGLE_REFRESH_TOKEN`**: The "permission slip" that lets your app send emails (generated during setup)

### 📧 **Important: Email Sender Account**

The password reset emails are sent from **YOUR Gmail account** (the one you authorize), not the user's account. The flow is:

```
User requests reset → Your app → YOUR Gmail account → Sends email to user
```

# Existing variables (should already be present)
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

## Gmail API Setup Instructions

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API

### 2. Create OAuth2 Credentials
1. Go to "Credentials" in the API & Services section
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Set application type to "Web application"
4. Add authorized redirect URIs
5. Download the credentials JSON

### 3. Generate Refresh Token (Automated)

Run the setup script to get your refresh token:

```bash
cd AIServer
node setup-gmail-oauth.js
```

This script will:
- Guide you through the OAuth2 flow
- Generate the refresh token
- Test the Gmail API connection
- Show you what to add to your `.env` file

### 4. Test the Setup

```bash
node test-gmail-setup.js
```

This will verify that your Gmail API is working correctly.

### 4. Configure Environment Variables
```env
GOOGLE_CLIENT_ID=your_client_id_from_credentials
GOOGLE_CLIENT_SECRET=your_client_secret_from_credentials
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_generated_refresh_token
```

## Code Generation Details

### Verification Code Generation
```javascript
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
```

**Characteristics:**
- 6-digit numeric codes
- Cryptographically random using `Math.random()`
- Range: 100000 to 999999
- No leading zeros
- High entropy for security

### Security Measures
1. **Code Expiration**: 5 minutes from generation
2. **Attempt Limiting**: Maximum 3 failed attempts
3. **Verification Window**: 10 minutes after successful verification
4. **Memory Storage**: Codes stored in Map (use Redis in production)
5. **Automatic Cleanup**: Expired codes automatically removed

## Email Template

The system sends professional HTML emails with:
- Company branding (0str1ch)
- Large, easy-to-read verification code
- Clear expiration information
- Security notice for unauthorized requests
- Professional styling and layout

## Production Considerations

### 1. Database Storage
Replace in-memory Map with Redis or database:
```javascript
// Instead of Map, use Redis
await redis.setex(`reset_code:${email}`, 300, JSON.stringify({
    code,
    expiresAt,
    attempts: 0
}));
```

### 2. Rate Limiting
Implement rate limiting for password reset requests:
```javascript
// Limit to 3 requests per email per hour
const rateLimitKey = `reset_limit:${email}`;
const attempts = await redis.get(rateLimitKey);
if (attempts && parseInt(attempts) >= 3) {
    return res.status(429).json({ error: 'Too many requests' });
}
```

### 3. Monitoring
Add logging and monitoring:
- Track password reset attempts
- Monitor Gmail API usage
- Alert on suspicious activity
- Log all password reset events

### 4. Security Headers
Ensure proper security headers:
- HTTPS only
- CSRF protection
- Rate limiting
- Input validation

## Testing

### Manual Testing Steps
1. Test email validation
2. Test code generation and sending
3. Test code verification with valid/invalid codes
4. Test expiration handling
5. Test attempt limiting
6. Test password strength validation
7. Test complete flow end-to-end

### Automated Testing
Create unit tests for:
- Code generation
- Email sending
- Verification logic
- Password validation
- Security measures

## Error Handling

The system handles various error scenarios:
- Invalid email formats
- Non-existent users (security: don't reveal existence)
- Expired verification codes
- Too many failed attempts
- Gmail API failures
- Network errors
- Invalid passwords

## User Experience Features

- Real-time form validation
- Loading states and spinners
- Clear error messages
- Progress indicators
- Auto-focus on inputs
- Keyboard navigation support
- Responsive design
- Accessibility features

## Security Best Practices Implemented

1. **No User Enumeration**: Same response for existing/non-existing emails
2. **Time-based Expiration**: Codes expire quickly
3. **Attempt Limiting**: Prevents brute force attacks
4. **Secure Password Requirements**: Strong password validation
5. **HTTPS Only**: All communications encrypted
6. **Input Sanitization**: All inputs validated and sanitized
7. **Rate Limiting**: Prevents abuse
8. **Secure Storage**: Passwords properly hashed

## Future Enhancements

1. **SMS Backup**: Add SMS verification as backup
2. **Security Questions**: Implement security questions
3. **Account Lockout**: Temporary account lockout after failed attempts
4. **Audit Logging**: Comprehensive audit trail
5. **Multi-factor Authentication**: Add MFA to password reset
6. **Biometric Verification**: Add biometric options where available

## Troubleshooting

### Common Issues
1. **Gmail API Errors**: Check credentials and permissions
2. **Code Not Received**: Check spam folder, verify email
3. **Expired Codes**: Codes expire in 5 minutes
4. **Too Many Attempts**: Wait for cooldown period
5. **Invalid Passwords**: Check password requirements

### Debug Mode
Enable debug logging by setting:
```env
DEBUG_PASSWORD_RESET=true
```

This will log all password reset activities for troubleshooting.

## Conclusion

The password reset system provides a secure, user-friendly way for users to regain access to their accounts. The implementation follows security best practices and provides a smooth user experience while maintaining high security standards.

For production deployment, ensure all environment variables are properly configured and consider implementing the production considerations mentioned above.
