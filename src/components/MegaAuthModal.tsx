import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Lock, User, X, CheckCircle, AlertCircle } from 'lucide-react';
import MegaApiService from '../services/megaApiService';

interface MegaAuthModalProps {
  isVisible: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const MegaAuthModal: React.FC<MegaAuthModalProps> = ({
  isVisible,
  onClose,
  onAuthSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setAuthStatus('idle');
    setErrorMessage('');

    try {
      // Check MEGA service status via backend
      const result = await MegaApiService.checkMegaStatus();
      
      if (result.success) {
        setAuthStatus('success');
        setTimeout(() => {
          onAuthSuccess();
          onClose();
        }, 1500);
      } else {
        setAuthStatus('error');
        setErrorMessage(result.message);
      }
    } catch (error) {
      setAuthStatus('error');
      setErrorMessage('Authentication failed. Please check your MEGA configuration in mega-config.js');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setPassword('');
      setAuthStatus('idle');
      setErrorMessage('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <motion.div 
                className="p-2 bg-blue-500 rounded-lg"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Cloud className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                  MEGA Cloud Storage
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connect your MEGA account
                </p>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200 disabled:opacity-50"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <Card className="border-0 shadow-none">
            <CardContent className="p-6">
              <form onSubmit={handleAuthenticate} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <label htmlFor="mega-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    MEGA Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="mega-email"
                      type="email"
                      placeholder="your-email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label htmlFor="mega-password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    MEGA Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="mega-password"
                      type="password"
                      placeholder="Your MEGA password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                  {authStatus === 'success' && (
                    <motion.div
                      className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-800 dark:text-green-200 text-sm">
                        Authentication successful! Redirecting...
                      </span>
                    </motion.div>
                  )}

                  {authStatus === 'error' && (
                    <motion.div
                      className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-800 dark:text-red-200 text-sm">
                        {errorMessage}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Authenticating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      Connect to MEGA
                    </div>
                  )}
                </Button>
              </form>

              {/* Info Section */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Why MEGA Cloud Storage?
                </h3>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 50GB free storage space</li>
                  <li>• Built-in compression for better efficiency</li>
                  <li>• Secure end-to-end encryption</li>
                  <li>• Fast upload/download speeds</li>
                  <li>• No database setup required</li>
                </ul>
              </div>

              {/* Security Note */}
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                Your credentials are stored locally and never sent to our servers.
                <br />
                We only use them to authenticate with MEGA's secure API.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
