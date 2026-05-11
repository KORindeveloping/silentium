import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

// Helper to create a dummy file for testing
const createDummyFile = (fileName: string, content: string) => {
  const filePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(filePath, content);
  return filePath;
};

// --- Test Scenario: Successful Upload Simulation ---
async function testSuccessfulUpload() {
  console.log('
--- Testing Successful Upload Scenario ---');
  let testFile1Path = '';
  let testFile2Path = '';
  try {
    // Create dummy files
    testFile1Path = createDummyFile('test-upload-book.pdf', 'This is a dummy PDF file content.');
    testFile2Path = createDummyFile('test-upload-cover.png', 'This is dummy PNG image content.');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFile1Path), {
      filename: 'test-upload-book.pdf',
      contentType: 'application/pdf'
    });
    form.append('coverImage', fs.createReadStream(testFile2Path), {
      filename: 'test-upload-cover.png',
      contentType: 'image/png'
    });
    form.append('title', 'Test Book Title for Upload');
    form.append('description', 'This is a test description for the book upload.');
    form.append('category', 'Academic');
    form.append('tags', 'test,upload,cli');
    form.append('visibility', 'public');
    form.append('readingMinutes', '10');
    form.append('pageCount', '100');

    console.log('Sending simulated upload request to production...');

    const response = await fetch('https://silentium-m9z8.onrender.com/api/books', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer YOUR_DUMMY_TOKEN_HERE', // Use a valid token if available, otherwise it might fail with 401
        'User-Agent': 'CLI-Test-Script'
      }
    });

    console.log('Response Status:', response.status);
    const responseBody = await response.text(); // Read as text first to debug parsing
    console.log('Response Body:', responseBody);

    if (response.ok) {
      console.log('✅ Successful Upload Test: Received 2xx status.');
    } else {
      console.error(`❌ Successful Upload Test Failed: Received status ${response.status}`);
    }

  } catch (error) {
    console.error('Error during Successful Upload Test:', error);
  } finally {
    // Clean up dummy files
    if (fs.existsSync(testFile1Path)) fs.unlinkSync(testFile1Path);
    if (fs.existsSync(testFile2Path)) fs.unlinkSync(testFile2Path);
  }
}

// --- Test Scenario: Missing Required Fields ---
async function testMissingFields() {
  console.log('
--- Testing Missing Fields Scenario ---');
  let testFile1Path = '';
  try {
    testFile1Path = createDummyFile('test-missing-fields.pdf', 'Content for missing fields test.');

    const form = new FormData();
    form.append('file', fs.createReadStream(testFile1Path), {
      filename: 'test-missing-fields.pdf',
      contentType: 'application/pdf'
    });
    // Missing title, description, etc.

    console.log('Sending request with missing fields to production...');

    const response = await fetch('https://silentium-m9z8.onrender.com/api/books', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer YOUR_DUMMY_TOKEN_HERE', // Dummy token
        'User-Agent': 'CLI-Test-Script'
      }
    });

    console.log('Response Status:', response.status);
    const responseBody = await response.text();
    console.log('Response Body:', responseBody);

    if (response.status === 400) {
      console.log('✅ Missing Fields Test: Received expected 400 status.');
    } else {
      console.error(`❌ Missing Fields Test Failed: Expected 400, but got ${response.status}`);
    }

  } catch (error) {
    console.error('Error during Missing Fields Test:', error);
  } finally {
    if (fs.existsSync(testFile1Path)) fs.unlinkSync(testFile1Path);
  }
}

// --- Test Scenario: File Too Large ---
async function testFileTooLarge() {
  console.log('
--- Testing File Too Large Scenario ---');
  // Create a dummy file larger than the 50MB limit
  const largeFileSizeMB = 60;
  const dummyFileContent = 'A'.repeat(largeFileSizeMB * 1024 * 1024);
  let largeFile1Path = '';
  try {
    largeFile1Path = createDummyFile('too-large.pdf', dummyFileContent);

    const form = new FormData();
    form.append('file', fs.createReadStream(largeFile1Path), {
      filename: 'too-large.pdf',
      contentType: 'application/pdf'
    });
    form.append('title', 'Large File Test');
    form.append('description', 'Testing upload with a file exceeding the size limit.');

    console.log('Sending request with a large file to production...');

    const response = await fetch('https://silentium-m9z8.onrender.com/api/books', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer YOUR_DUMMY_TOKEN_HERE', // Dummy token
        'User-Agent': 'CLI-Test-Script'
      }
    });

    console.log('Response Status:', response.status);
    const responseBody = await response.text();
    console.log('Response Body:', responseBody);

    if (response.status === 413) { // Expecting 413 Payload Too Large
      console.log('✅ File Too Large Test: Received expected 413 status.');
    } else {
      console.error(`❌ File Too Large Test Failed: Expected 413, but got ${response.status}`);
    }

  } catch (error) {
    console.error('Error during File Too Large Test:', error);
  } finally {
    if (fs.existsSync(largeFile1Path)) fs.unlinkSync(largeFile1Path);
  }
}

// --- Execute Tests ---
async function runAllTests() {
  // NOTE: Replace 'YOUR_DUMMY_TOKEN_HERE' with a real token if available, or mock auth for local testing.
  // For production tests, a valid token is usually required by the 'protect' middleware.
  // If you don't have a token, the 'Successful Upload Test' might fail with 401.
  
  await testSuccessfulUpload();
  await testMissingFields();
  await testFileTooLarge();
}

runAllTests();
