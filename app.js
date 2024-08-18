require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./src/routes/userRoutes');
const postRoutes = require('./src/routes/postRoutes');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swaggerConfig');
const swaggerUi = require('swagger-ui-express');


const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));