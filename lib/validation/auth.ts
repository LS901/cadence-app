import { z } from "zod";

const authEmailSchema = z.string().trim().email({ message: "Use a valid email address." });
const authPasswordSchema = z.string().min(8, "Password must be at least 8 characters.");

export const signInSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(80, "Name must be 80 characters or fewer."),
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: authPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });

export const authEmailRequestSchema = z.object({
  email: authEmailSchema,
});

export const resetPasswordSchema = z
  .object({
    email: authEmailSchema,
    token: z.string().trim().min(1, "Reset token is required."),
    password: authPasswordSchema,
    confirmPassword: authPasswordSchema,
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match.",
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type AuthEmailRequestValues = z.infer<typeof authEmailRequestSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;