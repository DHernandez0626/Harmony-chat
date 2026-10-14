"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

export default function Register() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({});

  const router = useRouter();

  async function onSubmit(data) {
    const response = await fetch("http://localhost:8000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: data.email,
        username: data.username,
        password: data.password,
      }),
    });

    if (!response.ok) {
      const body = await response.json();
      return;
    }

    router.push("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
      <div className="mx-auto w-full max-w-sm rounded-md border border-line bg-surface px-6 py-6">
        <p className="text-sm text-accent">New here</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Create an account
        </h1>
        <p className="mt-3 text-sm text-muted">
          Email, username, and a password are enough to join a room.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-5"
        >
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-rose-300">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
              placeholder="username"
              {...register("username")}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-rose-300">
                {errors.username.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-rose-300">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="passwordConfirm"
              className="mb-2 block text-sm font-medium"
            >
              Confirm password
            </label>
            <input
              type="password"
              id="passwordConfirm"
              className="w-full rounded-md border border-line bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
              placeholder="••••••••"
              {...register("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="mt-1 text-sm text-rose-300">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
          >
            Create account
          </button>
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-accent">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
