const axios = require('axios');

async function run() {
  try {
    // Admin login to get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'admin_password' // assuming this is not it, wait, we might not have the password.
    });
  } catch (e) {
    console.log('Cant log in easily');
  }
}
run();
