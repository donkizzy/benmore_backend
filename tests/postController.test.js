const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { faker } = require("@faker-js/faker");
const crypto = require("crypto");

beforeAll(async () => {
  // Connect to MongoDB
  await connectDB();
});

afterAll(async () => {
  // Close MongoDB connection
  await mongoose.connection.close();
});

describe("Post", () => {
  it("Create Post - should create a post successfully", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const res = await request(app)
      .post("/api/posts")
      .field("title", faker.word.words(3))
      .field("description", faker.word.words(10))
      .attach("file", "tests/assets/bubbles.jpg")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Post created successfully");
  }, 8000);

  it("Create Post - should handle missing file", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const res = await request(app)
      .post("/api/posts")
      .field("title", faker.word.words(3))
      .field("description", faker.word.words(10))
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Please attach a file");
  }, 8000);

  it("Get Post - should retrieve a post successfully", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const postRes = await request(app)
      .post("/api/posts")
      .field("title", faker.word.words(3))
      .field("description", faker.word.words(10))
      .attach("file", "tests/assets/bubbles.jpg")
      .set("Authorization", `Bearer ${token}`);

    const postId = postRes.body.post.id;

    const res = await request(app)
      .get(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Post retrieved successfully");
    expect(res.body.post).toHaveProperty("id", postId);
  }, 8000);

  it("Get Post - should handle post not found", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const nonExistentPostId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/posts/${nonExistentPostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Post not found");
  }, 8000);

  it("Get Post - should handle invalid post ID", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const invalidPostId = "invalidPostId";

    const res = await request(app)
      .get(`/api/posts/${invalidPostId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("An error occurred");
  }, 8000);

  it("Update Post - should update a post successfully", async () => {
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

    const { token } = (
      await request(app).post("/api/users/login").send(credentials)
    ).body;

    const postRes = await request(app)
      .post("/api/posts")
      .field("title", faker.word.words(3))
      .field("description", faker.word.words(10))
      .attach("file", "tests/assets/bubbles.jpg")
      .set("Authorization", `Bearer ${token}`);

    const postId = postRes.body.post.id;

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .field("title", "Updated Title")
      .field("description", "Updated Description")
      .attach("file", "tests/assets/bubbles.jpg")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Post updated successfully");
    expect(res.body.post).toHaveProperty("title", "Updated Title");
    expect(res.body.post).toHaveProperty("description", "Updated Description");
  }, 8000);
});
