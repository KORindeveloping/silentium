import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Create a test file
const testFilePath = path.join(process.cwd(), 'test-upload.pdf');
const testContent = 'This is a test PDF file for upload testing';
fs.writeFileSync(testFilePath, testContent);

// Test upload to local server
async function testUpload() {
  try {
    const form = new FormData();
    // Must match bookController expected fields
    form.append('file', fs.createReadStream(testFilePath), {
      filename: 'test-upload.pdf',
      contentType: 'application/pdf'
    });
    form.append('title', 'Test Book Title');
    form.append('description', 'Test Description');

    console.log('Testing upload to local server: POST /api/books');
    
    // NOTE: This test requires a valid auth token if auth middleware is strictly applied
    // For local dev, you might need to bypass or mock the 'protect'/'author' middleware in test
    
    const response = await fetch('http://localhost:3000/api/books', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer YOUR_DUMMY_TOKEN_HERE' 
      }
    });

    const result = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response JSON:', result);
    
  } catch (error) {
    console.error('Upload test failed:', error);
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testUpload();
