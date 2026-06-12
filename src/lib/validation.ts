import { z } from "zod";

export const userRoleSchema = z.enum(["TECHNICIAN", "SUPERVISOR"]);

export const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(100, "Full name must be at most 100 characters"),
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .max(20, "Employee code must be at most 20 characters")
    .regex(
      /^[A-Z0-9-]+$/,
      "Employee code may only contain uppercase letters, numbers, and hyphens",
    ),
  role: userRoleSchema.default("TECHNICIAN"),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type SignInSchema = z.infer<typeof signInSchema>;
