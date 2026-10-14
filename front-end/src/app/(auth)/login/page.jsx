"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginSchema } from "@/validations/loginSchema";
import { useRouter } from "next/navigation";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const router = useRouter();

  async function onSubmit(data) {
    const response = await fetch("http://localhost:8000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
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
        <p className="text-sm text-accent">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-3 text-sm text-muted">
          Use the username and password for your account.
        </p>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-8 flex flex-col gap-5"
        >
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
          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
          >
            Log in
          </button>
          <p className="text-sm text-muted">
            No account yet?{" "}
            <Link href="/register" className="text-accent">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
