require("dotenv").config();
const express = require("express");
const index = require("./src/routes/index");
const swaggerSpec = require("./config/swaggerConfig");
const swaggerUi = require("swagger-ui-express");

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
app.use(express.json());

app.use("/api", index);

module.exports = app;
