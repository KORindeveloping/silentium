import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const verify = async () => {
  try {
    console.log('--- Verifying Registration ---');
    const registerRes = await axios.post(`${API_URL}/auth/register`, {
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'author'
    });
    console.log('Registration Success:', registerRes.data);

    const token = registerRes.data.token;

    console.log('\n--- Verifying Profile Access ---');
    const profileRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile Success:', profileRes.data.email);

    console.log('\n--- Verifying Login ---');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: registerRes.data.email,
      password: 'Password123!'
    });
    console.log('Login Success:', loginRes.data.email);

    console.log('\n--- Verifying Book Creation ---');
    const bookRes = await axios.post(`${API_URL}/books`, {
      title: 'Test Book',
      description: 'Test Description',
      category: 'Guides',
      content: 'This is a test book content.'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Book Creation Success:', bookRes.data.title);

    console.log('\n--- ALL VERIFICATIONS PASSED ---');
  } catch (error: any) {
    console.error('Verification Failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
};

verify();
