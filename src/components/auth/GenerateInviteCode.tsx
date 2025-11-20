import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Key, Copy, CheckCircle } from '@/lib/icons';
import { authService } from './AuthService';

interface GenerateInviteCodeProps {
  onClose?: () => void;
}

export const GenerateInviteCode: React.FC<GenerateInviteCodeProps> = ({ onClose }) => {
  const [maxUses, setMaxUses] = useState('1');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedCode(null);

    try {
      const token = authService.getToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8090';
      const response = await fetch(`${backendUrl}/api/auth/generate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          maxUses: maxUses ? parseInt(maxUses) : 1,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : null,
          notes: notes.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate invite code');
        return;
      }

      if (data.success && data.inviteCode) {
        setGeneratedCode(data.inviteCode.code);
      } else {
        setError('Failed to generate invite code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedCode) {
      try {
        await navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (generatedCode) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Invite Code Generated</CardTitle>
          <CardDescription>
            Share this code with users you want to invite
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Your Invite Code</Label>
            <div className="flex gap-2">
              <Input
                value={generatedCode}
                readOnly
                className="font-mono text-lg font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600">Copied to clipboard!</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setGeneratedCode(null);
                setMaxUses('1');
                setExpiresInDays('');
                setNotes('');
              }}
            >
              Generate Another
            </Button>
            {onClose && (
              <Button
                type="button"
                className="flex-1"
                onClick={onClose}
              >
                Done
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Generate Invite Code</CardTitle>
        <CardDescription>
          Create an invite code to share with new users
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-uses">Max Uses</Label>
            <Input
              id="max-uses"
              type="number"
              min="1"
              placeholder="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              How many times this code can be used (default: 1)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires-days">Expires In (Days)</Label>
            <Input
              id="expires-days"
              type="number"
              min="1"
              placeholder="Optional - leave empty for no expiration"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Optional: Code will expire after this many days
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              placeholder="e.g., For beta testers"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate Code
                </>
              )}
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

