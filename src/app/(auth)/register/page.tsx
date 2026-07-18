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
  loginResponseSchema,
  registerInputSchema,
  registerResponseSchema,
  type RegisterInput,
} from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { token, hydrated, setSession } = useAuthStore();

  useEffect(() => {
    if (hydrated && token) router.replace('/dashboard');
  }, [hydrated, token, router]);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerInputSchema),
    defaultValues: {
      business_name: '',
      owner_name: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const register = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const created = await api.post('/api/auth/register', input);
      registerResponseSchema.parse(created.data);
      // Registration doesn't return a token — sign straight in.
      const logged = await api.post('/api/auth/login', {
        email: input.email,
        password: input.password,
      });
      return loginResponseSchema.parse(logged.data);
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
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Start collecting payments and understanding your sales
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit((input) => register.mutate(input))}
          noValidate
        >
          <Field>
            <Label htmlFor="business_name">Business name</Label>
            <Input
              id="business_name"
              placeholder="Ada's Fabrics"
              aria-invalid={!!errors.business_name}
              {...form.register('business_name')}
            />
            <FieldError>{errors.business_name?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="owner_name">Owner name</Label>
            <Input
              id="owner_name"
              placeholder="Ada Obi"
              autoComplete="name"
              aria-invalid={!!errors.owner_name}
              {...form.register('owner_name')}
            />
            <FieldError>{errors.owner_name?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="08031234567"
              autoComplete="tel"
              aria-invalid={!!errors.phone}
              {...form.register('phone')}
            />
            <FieldError>{errors.phone?.message}</FieldError>
          </Field>

          <Field>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ada@yourshop.ng"
              autoComplete="email"
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
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register('password')}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </Field>

          {register.isError && (
            <p role="alert" className="text-sm text-destructive">
              {apiErrorMessage(register.error)}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={register.isPending}
          >
            {register.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
