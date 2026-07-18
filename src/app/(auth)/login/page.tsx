'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiErrorMessage } from '@/lib/api';
import {
  loginInputSchema,
  loginResponseSchema,
  type LoginInput,
} from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const { token, hydrated, setSession } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  // Already signed in - go straight to the dashboard.
  useEffect(() => {
    if (hydrated && token) router.replace('/dashboard');
  }, [hydrated, token, router]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post('/api/auth/login', input);
      return loginResponseSchema.parse(res.data);
    },
    onSuccess: (data) => {
      setSession(data.token, data.merchant);
      router.replace('/dashboard');
    },
  });

  const { errors } = form.formState;

  return (
    <div className="flex flex-col">
      <h1 className="pb-1 text-4xl font-medium tracking-tight">Sign in</h1>
      <p className="text-muted-foreground">
        Please enter your details to access your account
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={form.handleSubmit((input) => login.mutate(input))}
        noValidate
      >
        <Field>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email address"
            className="h-11"
            aria-invalid={!!errors.email}
            {...form.register('email')}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11 pr-10"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          <FieldError>{errors.password?.message}</FieldError>
        </Field>

        {login.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(login.error)}
          </p>
        )}

        <Button
          type="submit"
          className="mt-1 h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Sprout?{' '}
        <Link
          href="/register"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
