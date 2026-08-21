import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import Ride from "../models/Ride.js";

async function registerAndLoginUser(email) {
  const payload = {
    firstName: "Rider",
    lastName: "One",
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
    username: "rideadmin",
    email: "rideadmin@example.com",
    password: "adminpass123",
  });
  const res = await request(app).post("/api/auth/admin-login").send({
    email: "rideadmin@example.com",
    password: "adminpass123",
  });
  return res.body.token;
}

const validRide = {
  pickupLocation: "Santa Barbara",
  dropoffLocation: "LAX",
  scheduledTime: "2027-01-01T10:00:00.000Z",
  contactInfo: "555-0100",
};

describe("POST /api/rides", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).post("/api/rides").send(validRide);
    expect(res.status).toBe(401);
  });

  it("books a ride for the authenticated user", async () => {
    const token = await registerAndLoginUser("rider1@example.com");
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRide);
    expect(res.status).toBe(201);
    expect(res.body.ride.pickupLocation).toBe(validRide.pickupLocation);
  });

  it("rejects missing fields", async () => {
    const token = await registerAndLoginUser("rider2@example.com");
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send({ pickupLocation: "Santa Barbara" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/rides", () => {
  it("only returns the requesting user's own rides", async () => {
    const tokenA = await registerAndLoginUser("riderA@example.com");
    const tokenB = await registerAndLoginUser("riderB@example.com");

    await request(app).post("/api/rides").set("Authorization", `Bearer ${tokenA}`).send(validRide);
    await request(app).post("/api/rides").set("Authorization", `Bearer ${tokenB}`).send(validRide);

    const res = await request(app).get("/api/rides").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe("PATCH /api/rides/:id (ownership)", () => {
  it("lets a user update the status of their own ride", async () => {
    const token = await registerAndLoginUser("owner@example.com");
    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    const patchRes = await request(app)
      .patch(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "In Progress" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.ride.status).toBe("In Progress");
  });

  it("blocks a different user from updating someone else's ride", async () => {
    const ownerToken = await registerAndLoginUser("owner2@example.com");
    const otherToken = await registerAndLoginUser("intruder@example.com");

    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    const patchRes = await request(app)
      .patch(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ status: "In Progress" });

    expect(patchRes.status).toBe(403);
  });
});

describe("DELETE /api/rides/:id (rider cancellation)", () => {
  it("lets a user cancel their own scheduled ride without removing the record", async () => {
    const token = await registerAndLoginUser("deleter@example.com");
    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    const deleteRes = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.ride.status).toBe("Cancelled");

    const stillExists = await Ride.findById(rideId);
    expect(stillExists).not.toBeNull();
    expect(stillExists.status).toBe("Cancelled");
  });

  it("blocks a different user from cancelling someone else's ride", async () => {
    const ownerToken = await registerAndLoginUser("owner3@example.com");
    const otherToken = await registerAndLoginUser("intruder2@example.com");

    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    const deleteRes = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(deleteRes.status).toBe(403);
  });

  it("rejects cancelling a ride that is already in progress", async () => {
    const token = await registerAndLoginUser("inprogress@example.com");
    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    await request(app)
      .patch(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "In Progress" });

    const deleteRes = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(400);
  });

  it("rejects cancelling a ride that is already completed", async () => {
    const token = await registerAndLoginUser("completed@example.com");
    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    await request(app)
      .patch(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });

    const deleteRes = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(400);
  });

  it("lets an admin permanently delete a ride", async () => {
    const userToken = await registerAndLoginUser("hard-delete-target@example.com");
    const adminToken = await registerAndLoginAdmin();

    const createRes = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${userToken}`)
      .send(validRide);
    const rideId = createRes.body.ride._id;

    const deleteRes = await request(app)
      .delete(`/api/rides/${rideId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(204);

    const stillExists = await Ride.findById(rideId);
    expect(stillExists).toBeNull();
  });
});
