// scripts/test-api.js
const fetch = require('node-fetch');

async function testAPI() {
  // Example: Test login endpoint
  const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password' })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login response:', loginData);
  
  // Use the token for authenticated requests
  const token = loginData.token;
  
  // Test protected endpoint
  const profileResponse = await fetch('http://localhost:3000/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const profileData = await profileResponse.json();
  console.log('Profile data:', profileData);
}

testAPI().catch(console.error);