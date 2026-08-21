import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

async function registerAndLoginUser(email) {
  const payload = {
    firstName: "Regular",
    lastName: "User",
    email,
    password: "password123",
  };
  await request(app).post("/api/auth/user-register").send(payload);
  const res = await request(app).post("/api/auth/user-login").send({
    email,
    password: payload.password,
  });
  return res.body.token;
}

async function registerAndLoginAdmin() {
  await request(app).post("/api/auth/admin-register").send({
    username: "admin",
    email: "admin@example.com",
    password: "adminpass123",
  });
  const res = await request(app).post("/api/auth/admin-login").send({
    email: "admin@example.com",
    password: "adminpass123",
  });
  return res.body.token;
}

// GET /api/user was, until earlier this session, fully unauthenticated and
// exposed every registered user's name and email to anyone. These tests
// guard against that regressing.
describe("GET /api/user (admin-only)", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/user");
    expect(res.status).toBe(401);
  });

  it("rejects a regular (non-admin) user", async () => {
    const token = await registerAndLoginUser("user@example.com");
    const res = await request(app).get("/api/user").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows an admin and never returns passwords", async () => {
    await registerAndLoginUser("user2@example.com");
    const adminToken = await registerAndLoginAdmin();
    const res = await request(app).get("/api/user").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].password).toBeUndefined();
  });
});

describe("GET /api/user/:id (admin-only)", () => {
  it("rejects a regular user", async () => {
    const token = await registerAndLoginUser("user3@example.com");
    const res = await request(app).get("/api/user/000000000000000000000000").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a nonexistent id when requested by an admin", async () => {
    const adminToken = await registerAndLoginAdmin();
    const res = await request(app)
      .get("/api/user/000000000000000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
