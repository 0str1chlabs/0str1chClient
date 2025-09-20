import React, { useState } from 'react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { VerifyCodeModal } from './VerifyCodeModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { toast } from '@/hooks/use-toast';

interface PasswordResetFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

type ResetStep = 'forgot' | 'verify' | 'reset' | 'success';

export const PasswordResetFlow: React.FC<PasswordResetFlowProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<ResetStep>('forgot');
  const [email, setEmail] = useState('');

  const handleEmailSent = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentStep('verify');
  };

  const handleCodeVerified = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentStep('reset');
  };

  const handlePasswordReset = (userEmail: string) => {
    setEmail(userEmail);
    setCurrentStep('success');
    toast({
      title: "Password Reset Complete",
      description: "You can now log in with your new password.",
    });
    
    // Close the modal after a short delay
    setTimeout(() => {
      onSuccess(userEmail);
      handleClose();
    }, 2000);
  };

  const handleClose = () => {
    setCurrentStep('forgot');
    setEmail('');
    onClose();
  };

  const handleBack = () => {
    if (currentStep === 'verify') {
      setCurrentStep('forgot');
    } else if (currentStep === 'reset') {
      setCurrentStep('verify');
    }
  };

  return (
    <>
      <ForgotPasswordModal
        isOpen={isOpen && currentStep === 'forgot'}
        onClose={handleClose}
        onEmailSent={handleEmailSent}
      />
      
      <VerifyCodeModal
        isOpen={isOpen && currentStep === 'verify'}
        onClose={handleClose}
        email={email}
        onCodeVerified={handleCodeVerified}
        onBack={handleBack}
      />
      
      <ResetPasswordModal
        isOpen={isOpen && currentStep === 'reset'}
        onClose={handleClose}
        email={email}
        onPasswordReset={handlePasswordReset}
      />
    </>
  );
};
