import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { db, hasDatabaseUrl } from "@/lib/db";
import { signUpSchema, type SignUpValues } from "@/lib/validation/auth";

export type RegisteredAuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type ExistingAuthUser = {
  id: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export type RegisterUserResult =
  | {
      status: "success";
      user: RegisteredAuthUser;
    }
  | {
      status: "error";
      code: "invalid_input";
      fieldErrors: Partial<Record<keyof SignUpValues, string[]>>;
    }
  | {
      status: "error";
      code: "database_unavailable";
      message: string;
    }
  | {
      status: "error";
      code: "email_taken";
      message: string;
      fieldErrors: {
        email: string[];
      };
    };

type RegisterUserOptions = {
  hasDatabase?: boolean;
  findUserByEmail?: (email: string) => Promise<ExistingAuthUser | null>;
  createUser?: (input: CreateUserInput) => Promise<RegisteredAuthUser>;
  hashPassword?: (password: string, saltRounds: number) => Promise<string>;
};

function isUniqueEmailConstraintError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && error.code === "P2002";
}

export async function registerCredentialUser(
  rawValues: Record<string, unknown>,
  options: RegisterUserOptions = {}
): Promise<RegisterUserResult> {
  const parsedValues = signUpSchema.safeParse(rawValues);

  if (!parsedValues.success) {
    return {
      status: "error",
      code: "invalid_input",
      fieldErrors: parsedValues.error.flatten().fieldErrors,
    };
  }

  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    return {
      status: "error",
      code: "database_unavailable",
      message: "Sign up is unavailable until the database connection is configured.",
    };
  }

  const existingUser = options.findUserByEmail
    ? await options.findUserByEmail(parsedValues.data.email)
    : await db!.user.findUnique({
        where: { email: parsedValues.data.email },
        select: { id: true },
      });

  if (existingUser) {
    return {
      status: "error",
      code: "email_taken",
      message: "An account already exists for this email address.",
      fieldErrors: {
        email: ["An account already exists for this email address."],
      },
    };
  }

  const passwordHash = await (options.hashPassword ?? hash)(parsedValues.data.password, 12);

  try {
    const user = options.createUser
      ? await options.createUser({
          name: parsedValues.data.name,
          email: parsedValues.data.email,
          passwordHash,
        })
      : await db!.user.create({
          data: {
            name: parsedValues.data.name,
            email: parsedValues.data.email,
            passwordHash,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

    return {
      status: "success",
      user: {
        id: user.id,
        name: user.name ?? parsedValues.data.name,
        email: user.email,
        image: user.image,
      },
    };
  } catch (error) {
    if (isUniqueEmailConstraintError(error)) {
      return {
        status: "error",
        code: "email_taken",
        message: "An account already exists for this email address.",
        fieldErrors: {
          email: ["An account already exists for this email address."],
        },
      };
    }

    throw error;
  }
}