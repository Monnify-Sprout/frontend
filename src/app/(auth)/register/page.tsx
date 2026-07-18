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
  loginResponseSchema,
  registerInputSchema,
  registerResponseSchema,
  type RegisterInput,
} from '@/lib/schemas';
import { useAuthStore } from '@/store/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { token, hydrated, setSession } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="flex flex-col">
      <h1 className="pb-1 text-4xl font-medium tracking-tight">
        Create your account
      </h1>
      <p className="text-muted-foreground">
        Start collecting payments and understanding your sales
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={form.handleSubmit((input) => register.mutate(input))}
        noValidate
      >
        <Field>
          <Label htmlFor="business_name">Business name</Label>
          <Input
            id="business_name"
            placeholder="Ada's Fabrics"
            className="h-11"
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
            className="h-11"
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
            className="h-11"
            aria-invalid={!!errors.phone}
            {...form.register('phone')}
          />
          <FieldError>{errors.phone?.message}</FieldError>
        </Field>

        <Field>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="ada@yourshop.ng"
            autoComplete="email"
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        {register.isError && (
          <p role="alert" className="text-sm text-destructive">
            {apiErrorMessage(register.error)}
          </p>
        )}

        <Button
          type="submit"
          className="mt-1 h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={register.isPending}
        >
          {register.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
