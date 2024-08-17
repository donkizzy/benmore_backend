const admin = require('firebase-admin');
const serviceAccount = require('../papi-s-experiments-firebase-adminsdk-m0unu-5e3d68da12.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://papi-s-experiments.appspot.com' 
});

const bucket = admin.storage().bucket();

module.exports = bucket;