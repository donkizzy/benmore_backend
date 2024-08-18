# Benmore Backend

A simple backend for Benmore Test.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/donkizzy/benmore_backend.git
   cd benmore_backend
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file in the root directory and add the following variables:
   ```env
   JWT_SECRET=your_jwt_secret
   EMAIL_PASSWORD=your_email_password
   EMAIL=your_email
   MONGO_URI_TEST=your_mongo_uri_test
   MONGO_URI=your_mongo_uri
   FIREBASE_CONFIG_PATH=your_firebase_config_path
   FIREBASE_TYPE=service_account
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   FIREBASE_CLIENT_ID=your_firebase_client_id
   FIREBASE_AUTH_URI=your_firebase_auth_uri
   FIREBASE_TOKEN_URI=your_firebase_token_uri
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=your_firebase_auth_provider_x509_cert_url
   FIREBASE_CLIENT_X509_CERT_URL=your_firebase_client_x509_cert_url
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   ```

## Configuration

- Firebase configuration is set up in [config/firebaseConfig.js](config/firebaseConfig.js).
- Swagger configuration is set up in [config/swaggerConfig](config/swaggerConfig).

## Usage

1. Start the server:

   ```sh
   npm start
   ```

2. The server will be running on `https://benmore-backend.onrender.com`.

## Testing

Run the tests using Jest:

```sh
npm test
```

## API Documentation

API documentation is generated using Swagger. You can access it at http://localhost:3000/api-docs.

Swagger configuration is located in `config/swaggerConfig`.
