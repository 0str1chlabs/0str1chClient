import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Mail, CheckCircle, ArrowLeft } from '@/lib/icons';
import { EmailEncryption } from './EmailEncryption';

interface InviteRequestQueueProps {
  onBack: () => void;
  userEmail: string;
  userName?: string;
}

export const InviteRequestQueue: React.FC<InviteRequestQueueProps> = ({ 
  onBack,
  userEmail,
  userName 
}) => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(userEmail || '');
  const [name, setName] = useState(userName || '');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Encrypt email before sending
      const encryptedEmail = await EmailEncryption.encrypt(email.trim());

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const response = await fetch(`${backendUrl}/api/auth/request-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: encryptedEmail,
          name: name.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit invite request');
        return;
      }

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit invite request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit invite request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
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
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold">Request Submitted</CardTitle>
            <CardDescription>
              You're in the queue! We'll respond to you soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                Your invite request has been submitted successfully. We'll review your request and get back to you via email. 
                Please check your inbox for updates.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={onBack} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Invite Code
            </Button>
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
          <CardTitle className="text-2xl font-bold">Request Invite</CardTitle>
          <CardDescription>
            Join the waitlist for platform access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="request-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-name">Name (Optional)</Label>
              <Input
                id="request-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !email.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBack}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

