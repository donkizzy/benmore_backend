const request = require("supertest");
const app = require("../app");
const connectDB = require("../config/db");
const { faker } = require("@faker-js/faker");

beforeAll(async () => {
  // Connect to MongoDB
  await connectDB();
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
});
