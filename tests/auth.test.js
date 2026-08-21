import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("POST /api/auth/user-register", () => {
  it("registers a new user", async () => {
    const res = await request(app).post("/api/auth/user-register").send({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.password).toBeUndefined();
  });

  it("rejects missing fields", async () => {
    const res = await request(app).post("/api/auth/user-register").send({
      email: "test@example.com",
    });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    const payload = {
      firstName: "Test",
      lastName: "User",
      email: "dup@example.com",
      password: "password123",
    };
    await request(app).post("/api/auth/user-register").send(payload);
    const res = await request(app).post("/api/auth/user-register").send(payload);
    expect(res.status).toBe(409);
  });

  it("rejects a password under 8 characters", async () => {
    const res = await request(app).post("/api/auth/user-register").send({
      firstName: "Test",
      lastName: "User",
      email: "short@example.com",
      password: "short",
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/user-login", () => {
  const credentials = {
    firstName: "Login",
    lastName: "Test",
    email: "login@example.com",
    password: "password123",
  };

  it("logs in with correct credentials and returns a token", async () => {
    await request(app).post("/api/auth/user-register").send(credentials);
    const res = await request(app).post("/api/auth/user-login").send({
      email: credentials.email,
      password: credentials.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe(credentials.email);
  });

  it("rejects an incorrect password", async () => {
    await request(app).post("/api/auth/user-register").send(credentials);
    const res = await request(app).post("/api/auth/user-login").send({
      email: credentials.email,
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects a nonexistent email", async () => {
    const res = await request(app).post("/api/auth/user-login").send({
      email: "nobody@example.com",
      password: "password123",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/admin-register and admin-login", () => {
  it("registers and logs in an admin", async () => {
    const registerRes = await request(app).post("/api/auth/admin-register").send({
      username: "admin1",
      email: "admin1@example.com",
      password: "adminpass123",
    });
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app).post("/api/auth/admin-login").send({
      email: "admin1@example.com",
      password: "adminpass123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it("rejects a duplicate username or email", async () => {
    const payload = { username: "admin2", email: "admin2@example.com", password: "adminpass123" };
    await request(app).post("/api/auth/admin-register").send(payload);
    const res = await request(app).post("/api/auth/admin-register").send(payload);
    expect(res.status).toBe(409);
  });
});
