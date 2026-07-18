'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

  // Already signed in — go straight to the dashboard.
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your Sprout account</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((input) => login.mutate(input))}
          noValidate
        >
          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ada@yourshop.ng"
              aria-invalid={!!errors.email}
              {...form.register('email')}
            />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>

          {login.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(login.error)}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={login.isPending}
          >
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Sprout?{' '}
          <Link
            href="/register"
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
