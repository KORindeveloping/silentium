
const API_URL = 'http://localhost:3000/api';

interface ErrorResponse {
  response?: {
    status: number;
    data: any;
  };
  message?: string;
}

const verify = async () => {
  try {
    console.log('--- Verifying Registration ---');
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'author'
      })
    });
    const registerData = await registerRes.json();
    if (!registerRes.ok) throw { response: { status: registerRes.status, data: registerData } };
    console.log('Registration Success:', registerData);

    const token = registerData.token;

    console.log('\n--- Verifying Profile Access ---');
    const profileRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const profileData = await profileRes.json();
    if (!profileRes.ok) throw { response: { status: profileRes.status, data: profileData } };
    console.log('Profile Success:', profileData.email);

    console.log('\n--- Verifying Login ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: registerData.email,
        password: 'Password123!'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw { response: { status: loginRes.status, data: loginData } };
    console.log('Login Success:', loginData.email);

    console.log('\n--- Verifying Book Creation ---');
    const bookRes = await fetch(`${API_URL}/books`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        title: 'Test Book',
        description: 'Test Description',
        category: 'Guides',
        content: 'This is a test book content.'
      })
    });
    const bookData = await bookRes.json();
    if (!bookRes.ok) throw { response: { status: bookRes.status, data: bookData } };
    console.log('Book Creation Success:', bookData.title);

    console.log('\n--- ALL VERIFICATIONS PASSED ---');
  } catch (error: any) {
    console.error('Verification Failed:');
    const err = error as ErrorResponse;
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else if (err.message) {
      console.error('Error:', err.message);
    } else {
      console.error('Error:', String(error));
    }
    process.exit(1);
  }
};

verify();
