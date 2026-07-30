const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/send-otp', {
      email: 'reddygowtham397@gmail.com',
      name: 'Admin',
      type: 'admin',
      context: 'login'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
