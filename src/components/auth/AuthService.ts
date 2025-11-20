import { EmailEncryption } from './EmailEncryption';
import { initializeTourForNewSignup } from '@/lib/tourUtils';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  refreshToken: string;
  tokenExpiration?: string;
  rememberMe?: boolean;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface GoogleAuthRequest {
  token: string;
  rememberMe?: boolean;
}

export interface TokenVerificationResponse {
  valid: boolean;
  user?: User;
  tokenExpiration?: string;
  error?: string;
  expired?: boolean;
}

class AuthService {
  private baseURL: string;

  constructor() {
    // Use VITE_BACKEND_URL or VITE_API_URL if available, otherwise fallback to localhost for development
    const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:8090';
    this.baseURL = backendUrl + '/api/auth';
    console.log('🔧 AuthService initialized with baseURL:', this.baseURL);
    console.log('🔧 VITE_BACKEND_URL from env:', import.meta.env.VITE_BACKEND_URL);
  }
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'user_data';
  private tokenExpirationKey = 'token_expiration';
  private rememberMeKey = 'remember_me';
  private previousUserIdKey = 'previous_user_id'; // Track previous user ID

  // Store tokens in localStorage
  private setTokens(token: string, refreshToken: string, tokenExpiration?: string, rememberMe?: boolean): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    
    if (tokenExpiration) {
      localStorage.setItem(this.tokenExpirationKey, tokenExpiration);
    }
    
    if (rememberMe !== undefined) {
      localStorage.setItem(this.rememberMeKey, rememberMe.toString());
    }
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Get stored refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  // Get token expiration
  getTokenExpiration(): string | null {
    return localStorage.getItem(this.tokenExpirationKey);
  }

  // Check if remember me is enabled
  isRememberMeEnabled(): boolean {
    const rememberMe = localStorage.getItem(this.rememberMeKey);
    return rememberMe === 'true';
  }

  // Store user data
  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    // Track previous user ID for switching detection
    localStorage.setItem(this.previousUserIdKey, user.id);
  }
  
  // Get previous user ID
  private getPreviousUserId(): string | null {
    return localStorage.getItem(this.previousUserIdKey);
  }
  
  // Clear all user data (IndexedDB and localStorage) when switching users
  private async clearAllUserData(): Promise<void> {
    try {
      console.log('🧹 Clearing all user data for new user...');
      
      // 0. Clear conversation context first
      console.log('💬 Step 0: Clearing conversation context...');
      try {
        const { resetMessageContextManager } = await import('@/lib/messageContextManager');
        resetMessageContextManager();
        // Also clear from localStorage
        localStorage.removeItem('ai_conversation_context');
        localStorage.removeItem('ai_conversation_summary');
        console.log('✅ Conversation context cleared');
      } catch (error) {
        console.error('❌ Error clearing conversation context:', error);
      }
      
      // 1. Clear localStorage FIRST (fast, non-blocking)
      console.log('📦 Step 1: Clearing localStorage (except auth data)...');
      const keysToPreserve = [
        this.tokenKey,
        this.refreshTokenKey,
        this.userKey,
        this.tokenExpirationKey,
        this.rememberMeKey,
        this.previousUserIdKey
      ];
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToPreserve.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removed localStorage key: ${key}`);
      });
      
      console.log(`✅ Cleared ${keysToRemove.length} localStorage items`);
      
      // 2. Clear IndexedDB (async, non-blocking - don't wait for it)
      console.log('📊 Step 2: Clearing IndexedDB (async, non-blocking)...');
      
      // Start IndexedDB clearing in background (don't await)
      this.clearIndexedDBAsync().catch(error => {
        console.error('❌ Error clearing IndexedDB (background):', error);
      });
      
      console.log('✅ All user data clearing initiated - login can proceed');
    } catch (error) {
      console.error('❌ Error clearing user data:', error);
      // Don't throw - continue with login even if clearing fails
    }
  }
  
  // Clear IndexedDB asynchronously (non-blocking)
  private async clearIndexedDBAsync(): Promise<void> {
    try {
      // First, try to close any open connections
      try {
        const indexedDBModule = await import('@/lib/indexedDBService').catch(() => null);
        if (indexedDBModule?.indexedDBService) {
          const service = indexedDBModule.indexedDBService as any;
          if (service.db) {
            service.db.close();
            service.db = null;
            console.log('✅ Closed existing IndexedDB connection');
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (error) {
        console.log('⚠️ Could not close IndexedDB connection:', error);
      }
      
      // Delete the database with timeout
      const deleteRequest = indexedDB.deleteDatabase('AISheetsDB');
      
      // Handle all possible events
      deleteRequest.onsuccess = () => {
        console.log('✅ IndexedDB cleared successfully');
      };
      
      deleteRequest.onerror = () => {
        console.error('❌ Error clearing IndexedDB:', deleteRequest.error);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('⚠️ IndexedDB deletion blocked - will retry after connections close');
        // The deletion will proceed once connections are closed
      };
      
      // Don't wait - just start the deletion
      // If it times out or gets blocked, we'll continue anyway
      setTimeout(() => {
        if (deleteRequest.readyState === 'pending') {
          console.warn('⚠️ IndexedDB deletion still pending after 3 seconds, continuing...');
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error in IndexedDB clearing:', error);
    }
  }
  
  // Check if user has changed and clear data if needed (public for AuthContext)
  async checkAndHandleUserSwitch(newUserId: string): Promise<void> {
    const previousUserId = this.getPreviousUserId();
    
    if (previousUserId && previousUserId !== newUserId) {
      console.log('🔄 User switch detected:', {
        previous: previousUserId,
        current: newUserId
      });
      
      // Clear all user data for the new user
      await this.clearAllUserData();
    } else if (!previousUserId) {
      console.log('👋 First-time login detected');
    } else {
      console.log('✅ Same user, no data clearing needed');
    }
  }

  // Get stored user data
  getUser(): User | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Clear all auth data
  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenExpirationKey);
    localStorage.removeItem(this.rememberMeKey);
    // Note: We keep previousUserIdKey to track user switches even after logout
  }

  // Check if token is expired
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return true;
    }
  }

  // Verify token with server
  async verifyToken(): Promise<TokenVerificationResponse> {
    try {
      const token = this.getToken();
      if (!token) {
        return { valid: false, error: 'No token found' };
      }
     console.log("bseurlll", this.baseURL)
      const response = await fetch(`${this.baseURL}/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { 
          valid: false, 
          error: error.error || 'Token verification failed',
          expired: error.expired
        };
      }

      const data = await response.json();
      return {
        valid: true,
        user: data.user,
        tokenExpiration: data.tokenExpiration
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      };
    }
  }

  // Make authenticated request with session cookies
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getToken(); // Keep for backward compatibility
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }), // Fallback for backward compatibility
      ...options.headers,
    };

    // Use credentials: 'include' to send HTTP-only cookies
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important: sends HTTP-only session cookies
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry the request with new token
        const newToken = this.getToken();
        const newHeaders = {
          'Content-Type': 'application/json',
          ...(newToken && { Authorization: `Bearer ${newToken}` }),
          ...options.headers,
        };

        return fetch(url, {
          ...options,
          headers: newHeaders,
          credentials: 'include', // Send cookies
        });
      }
    }

    return response;
  }

  // Email/Password Signup
  async signup(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      const encryptedEmail = await EmailEncryption.encrypt(email);
      
      const response = await fetch(`${this.baseURL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({
          email: encryptedEmail,
          password,
          name,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }

      const data: AuthResponse = await response.json();
      
      // Check if user has changed (for signup, always treat as new user)
      await this.checkAndHandleUserSwitch(data.user.id);
      
      this.setTokens(data.token, data.refreshToken, data.tokenExpiration, data.rememberMe);
      this.setUser(data.user);
      
      // Mark user as first-time signup for tour
      initializeTourForNewSignup(data.user.id);
      
      return data;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  // Email/Password Login
  async login(email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> {
    try {
      const encryptedEmail = await EmailEncryption.encrypt(email);
      
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({
          email: encryptedEmail,
          password,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      
      // Check if user has changed before storing tokens
      await this.checkAndHandleUserSwitch(data.user.id);
      
      this.setTokens(data.token, data.refreshToken, data.tokenExpiration, data.rememberMe);
      this.setUser(data.user);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Google OAuth Login
  async googleLogin(token: string, rememberMe: boolean = false): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({
          token,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Google login failed');
      }

      const data: AuthResponse = await response.json();
      
      // Check if user has changed before storing tokens
      await this.checkAndHandleUserSwitch(data.user.id);
      
      this.setTokens(data.token, data.refreshToken, data.tokenExpiration, data.rememberMe);
      this.setUser(data.user);
      return data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  // Hardcoded login (for testing with password@123)
  async hardcodedLogin(email: string, rememberMe: boolean = false): Promise<AuthResponse> {
    try {
      const encryptedEmail = await EmailEncryption.encrypt(email);
      console.log("bseurlll", this.baseURL)
      
      
      
      const response = await fetch(`${this.baseURL}/hardcoded-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({
          email: encryptedEmail,
          rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Hardcoded login failed');
      }

      const data: AuthResponse = await response.json();
      
      // Check if user has changed before storing tokens
      await this.checkAndHandleUserSwitch(data.user.id);
      
      this.setTokens(data.token, data.refreshToken, data.tokenExpiration, data.rememberMe);
      this.setUser(data.user);
      return data;
    } catch (error) {
      console.error('Hardcoded login error:', error);
      throw error;
    }
  }

  // Refresh token
  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies
        body: JSON.stringify({
          refreshToken,
        }),
      });

      if (!response.ok) {
        this.clearAuth();
        return false;
      }

      const data = await response.json();
      this.setTokens(data.token, data.refreshToken, data.tokenExpiration);
      return true;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearAuth();
      return false;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await this.makeRequest(`${this.baseURL}/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.makeRequest(`${this.baseURL}/me`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Check if user has changed (might happen if token was used by different user)
      await this.checkAndHandleUserSwitch(data.user.id);
      
      this.setUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired
    if (this.isTokenExpired()) {
      return false;
    }

    return true;
  }

  // Auto-login if remember me is enabled and token is valid
  async autoLogin(): Promise<User | null> {
    if (!this.isRememberMeEnabled()) {
      return null;
    }

    if (!this.isAuthenticated()) {
      // Try to refresh token
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        return null;
      }
    }

    // Verify token with server
    const verification = await this.verifyToken();
    if (!verification.valid) {
      this.clearAuth();
      return null;
    }

    return verification.user || null;
  }
}

export const authService = new AuthService(); 