import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Shield, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VerifyCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onCodeVerified: (email: string) => void;
  onBack: () => void;
}

export const VerifyCodeModal: React.FC<VerifyCodeModalProps> = ({
  isOpen,
  onClose,
  email,
  onCodeVerified,
  onBack
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive"
      });
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      toast({
        title: "Invalid Code",
        description: "Verification code must contain only numbers.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(),
          code: code.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Code Verified",
          description: "Verification successful! You can now reset your password.",
        });
        onCodeVerified(email.trim());
      } else {
        toast({
          title: "Verification Failed",
          description: data.message || "Invalid verification code. Please try again.",
          variant: "destructive"
        });
        setCode('');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "Network Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Code Resent",
          description: "A new verification code has been sent to your email.",
        });
        setTimeLeft(300); // Reset timer
        setCode('');
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to resend verification code. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resending code:', error);
      toast({
        title: "Network Error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleVerifyCode();
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Verify Code</CardTitle>
          </div>
          <CardDescription>
            Enter the 6-digit verification code sent to {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              ref={inputRef}
              id="code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="w-full text-center text-2xl tracking-widest font-mono"
              maxLength={6}
            />
            <p className="text-sm text-muted-foreground text-center">
              Code expires in {formatTime(timeLeft)}
            </p>
          </div>
          
          <Button
            onClick={handleVerifyCode}
            disabled={isLoading || code.length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Verifying...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Verify Code
              </>
            )}
          </Button>

          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={isResending || timeLeft > 240} // Can resend after 1 minute
              className="text-muted-foreground"
            >
              {isResending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1" />
                  Resending...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Resend Code
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
