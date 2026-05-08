import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

// Create a test file
const testContent = 'This is a test PDF file for upload testing';
fs.writeFileSync('test-upload.pdf', testContent);

// Test upload to local server
async function testUpload() {
  try {
    const form = new FormData();
    form.append('avatar', fs.createReadStream('test-upload.pdf'), {
      filename: 'test-upload.pdf',
      contentType: 'application/pdf'
    });

    console.log('Testing upload to local server...');
    
    // Test local upload first
    const response = await fetch('http://localhost:3000/api/auth/profile', {
      method: 'PUT',
      body: form,
      headers: form.getHeaders()
    });

    console.log('Local upload response:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Upload result:', result);
      
      // Test file access
      if (result.avatar) {
        console.log('Testing file access:', result.avatar);
        const fileResponse = await fetch(result.avatar);
        console.log('File access response:', fileResponse.status);
      }
    }
  } catch (error) {
    console.error('Upload test failed:', error.message);
  } finally {
    // Clean up test file
    if (fs.existsSync('test-upload.pdf')) {
      fs.unlinkSync('test-upload.pdf');
    }
  }
}

testUpload();
