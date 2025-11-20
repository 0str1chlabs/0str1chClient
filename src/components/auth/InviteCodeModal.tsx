import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Key, HelpCircle, ArrowLeft } from '@/lib/icons';
import { authService } from './AuthService';

interface InviteCodeModalProps {
  onVerifySuccess: () => void;
  onRequestInvite: () => void;
  onChangeEmail: () => void;
  userEmail: string;
}

export const InviteCodeModal: React.FC<InviteCodeModalProps> = ({ 
  onVerifySuccess, 
  onRequestInvite,
  onChangeEmail,
  userEmail 
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check invite status on mount
  useEffect(() => {
    checkInviteStatus();
  }, []);

  const checkInviteStatus = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        setCheckingStatus(false);
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const response = await fetch(`${backendUrl}/api/auth/invite-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' // Include cookies for session-based auth
      });

      if (response.ok) {
        const data = await response.json();
        const verified =
          data.isAllowed === true ||
          data.isAllowed === 'true' ||
          !!data.inviteVerified;
        if (verified) {
          // User already verified, allow access
          onVerifySuccess();
          return;
        }
      }
    } catch (error) {
      console.error('Error checking invite status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = authService.getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const response = await fetch(`${backendUrl}/api/auth/verify-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error message from backend, or default to "Invite code unverified"
        setError(data.error || 'Invite code unverified');
        return;
      }

      if (data.success) {
        // Access verified successfully
        onVerifySuccess();
      } else {
        setError(data.error || 'Failed to verify access');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify access');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking invite status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Prevent closing by clicking outside
        if (e.target === e.currentTarget) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <Card className="w-full max-w-md">
          <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Invite Only Platform</CardTitle>
          <CardDescription>
            Enter your invite code to access the platform
          </CardDescription>
          <p className="text-sm text-muted-foreground mt-2">
            Logged in as: <span className="font-medium">{userEmail}</span>
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-code"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You need a valid invite code to access the platform.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !inviteCode.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Invite Code'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onRequestInvite}
                disabled={loading}
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Request Invite
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onChangeEmail}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Email
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

