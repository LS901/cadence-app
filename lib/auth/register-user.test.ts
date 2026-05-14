import assert from "node:assert/strict";
import test from "node:test";
import { registerCredentialUser } from "./register-user";

test("registerCredentialUser creates a database-backed user when the payload is valid", async () => {
  const createdUsers: Array<{
    name: string;
    email: string;
    passwordHash: string;
  }> = [];

  const result = await registerCredentialUser(
    {
      name: "Morgan Reed",
      email: "morgan@cadence.app",
      password: "cadence-pass",
      confirmPassword: "cadence-pass",
    },
    {
      hasDatabase: true,
      findUserByEmail: async () => null,
      hashPassword: async (password, saltRounds) => `${password}:${saltRounds}`,
      createUser: async (input) => {
        createdUsers.push(input);

        return {
          id: "user-1",
          name: input.name,
          email: input.email,
          image: null,
        };
      },
    }
  );

  assert.deepEqual(result, {
    status: "success",
    user: {
      id: "user-1",
      name: "Morgan Reed",
      email: "morgan@cadence.app",
      image: null,
    },
  });
  assert.deepEqual(createdUsers, [
    {
      name: "Morgan Reed",
      email: "morgan@cadence.app",
      passwordHash: "cadence-pass:12",
    },
  ]);
});

test("registerCredentialUser rejects invalid payloads before any database work", async () => {
  const result = await registerCredentialUser(
    {
      name: "",
      email: "not-an-email",
      password: "short",
      confirmPassword: "different",
    },
    {
      hasDatabase: true,
      findUserByEmail: async () => {
        throw new Error("should not be called");
      },
    }
  );

  assert.equal(result.status, "error");
  assert.equal(result.code, "invalid_input");
  assert.deepEqual(result.fieldErrors.name, ["Enter your name."]);
  assert.deepEqual(result.fieldErrors.email, ["Use a valid email address."]);
  assert.deepEqual(result.fieldErrors.password, ["Password must be at least 8 characters."]);
});

test("registerCredentialUser reports when sign up is unavailable without a database", async () => {
  const result = await registerCredentialUser({
    name: "Morgan Reed",
    email: "morgan@cadence.app",
    password: "cadence-pass",
    confirmPassword: "cadence-pass",
  }, {
    hasDatabase: false,
  });

  assert.deepEqual(result, {
    status: "error",
    code: "database_unavailable",
    message: "Sign up is unavailable until the database connection is configured.",
  });
});

test("registerCredentialUser rejects duplicate email addresses before creating a user", async () => {
  let createCalls = 0;

  const result = await registerCredentialUser(
    {
      name: "Morgan Reed",
      email: "morgan@cadence.app",
      password: "cadence-pass",
      confirmPassword: "cadence-pass",
    },
    {
      hasDatabase: true,
      findUserByEmail: async () => ({ id: "existing-user" }),
      createUser: async () => {
        createCalls += 1;

        return {
          id: "user-1",
          name: "Morgan Reed",
          email: "morgan@cadence.app",
        };
      },
    }
  );

  assert.deepEqual(result, {
    status: "error",
    code: "email_taken",
    message: "An account already exists for this email address.",
    fieldErrors: {
      email: ["An account already exists for this email address."],
    },
  });
  assert.equal(createCalls, 0);
});

test("registerCredentialUser maps unique constraint collisions to duplicate-email errors", async () => {
  const result = await registerCredentialUser(
    {
      name: "Morgan Reed",
      email: "morgan@cadence.app",
      password: "cadence-pass",
      confirmPassword: "cadence-pass",
    },
    {
      hasDatabase: true,
      findUserByEmail: async () => null,
      hashPassword: async () => "hashed-password",
      createUser: async () => {
        throw {
          code: "P2002",
        };
      },
    }
  );

  assert.deepEqual(result, {
    status: "error",
    code: "email_taken",
    message: "An account already exists for this email address.",
    fieldErrors: {
      email: ["An account already exists for this email address."],
    },
  });
});