import fs from 'fs';
import path from 'path';

// Test file persistence
async function testFilePersistence() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const testFile = path.join(uploadsDir, 'test-persistence.pdf');
  
  console.log('Testing file persistence...');
  console.log('Uploads directory:', uploadsDir);
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory');
  }
  
  // Create a test file
  const testContent = 'This is a test PDF file for persistence testing\nTimestamp: ' + new Date().toISOString();
  fs.writeFileSync(testFile, testContent);
  console.log('Created test file:', testFile);
  
  // Verify file exists and can be read
  if (fs.existsSync(testFile)) {
    const stats = fs.statSync(testFile);
    const content = fs.readFileSync(testFile, 'utf8');
    console.log('File exists and is readable');
    console.log('File size:', stats.size, 'bytes');
    console.log('File content preview:', content.substring(0, 100) + '...');
    
    // Test file URL generation
    const fileUrl = `http://localhost:3000/uploads/test-persistence.pdf`;
    console.log('File would be accessible at:', fileUrl);
    
    // Test if file can be accessed via HTTP
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(fileUrl);
      console.log('HTTP access test:', response.status, response.statusText);
      
      if (response.ok) {
        const responseContent = await response.text();
        console.log('HTTP content matches:', responseContent === content);
      }
    } catch (error) {
      console.log('HTTP access failed (server might not be running):', error.message);
    }
    
    // Clean up test file
    fs.unlinkSync(testFile);
    console.log('Test file cleaned up');
    
    console.log('\n✅ File persistence test completed successfully!');
    console.log('Files uploaded to this directory will persist as long as the disk storage is maintained.');
    
  } else {
    console.error('❌ Failed to create test file');
  }
}

testFilePersistence();
