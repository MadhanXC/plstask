"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  isSignUpMode: boolean;
  children: React.ReactNode;
}

export function AuthCard({ isSignUpMode, children }: AuthCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isSignUpMode ? 'Create Account' : 'Welcome Back'}</CardTitle>
        <CardDescription>
          {isSignUpMode
            ? 'Fill in your details to create a new account'
            : 'Sign in to your account to continue'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}