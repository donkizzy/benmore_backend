const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { faker } = require("@faker-js/faker");

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("User Controller", () => {
  let token;
  let userId;

  beforeEach(async () => {
    const credentials = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };

    const user = await request(app)
      .post("/api/users/register")
      .send({
        username: faker.internet.userName(),
        ...credentials,
      });

    token = (await request(app).post("/api/users/login").send(credentials)).body
      .token;

    userId = user.body.user.id;
  });

  it("Register - should register a user successfully", async () => {
    const res = await request(app).post("/api/users/register").send({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Your registration was successful");
  });

  it("Register - should handle existing email or username", async () => {
    const credentials = {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    };

    await request(app).post("/api/users/register").send(credentials);

    const res = await request(app)
      .post("/api/users/register")
      .send(credentials);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User already exists");
  });

  it("Login - should login a user successfully", async () => {
    const credentials = {
      email: faker.internet.email(),
      password: faker.internet.password(),
    };

    await request(app)
      .post("/api/users/register")
      .send({
        username: faker.internet.userName(),
        ...credentials,
      });

    const res = await request(app).post("/api/users/login").send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
  });

  it("Login - should handle incorrect email or password", async () => {
    const res = await request(app).post("/api/users/login").send({
      email: "wrongemail@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Incorrect Username Or Password");
  });

  it("Get User - should retrieve a user by ID successfully", async () => {
    const res = await request(app)
      .get(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
  });

  it("Get User - should handle invalid user ID", async () => {
    const res = await request(app)
      .get(`/api/users/invalidID`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("Get User - should handle user not found", async () => {
    const res = await request(app)
      .get(`/api/users/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });

  it("Delete User - should delete a user successfully", async () => {
    const res = await request(app)
      .delete(`/api/users/${userId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("User deleted successfully");
  });

  it("Delete User - should handle user not found", async () => {
    const res = await request(app)
      .delete(`/api/users/507f1f77bcf86cd799439011`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found");
  });
});
