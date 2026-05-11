import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = (filePath: string, folder: string, resourceType: 'auto' | 'raw' | 'image' | 'video' = 'auto'): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { 
        folder, 
        resource_type: resourceType,
        type: 'upload', // Ensure it's a standard upload
        access_mode: 'public', // Explicitly set to public
        use_filename: true, // Preserve original filename
        unique_filename: false, // Don't generate random filename
        overwrite: true, // Overwrite existing files
        secure: true, // Force HTTPS URLs
        allowed_formats: ['pdf', 'doc', 'docx', 'epub', 'jpg', 'jpeg', 'png', 'webp'] // Explicit allowed formats
      },
      (error, result) => {
        if (result) {
          console.log(`Cloudinary upload success: ${result.secure_url} (resource_type: ${resourceType})`);
          resolve(result);
        } else {
          console.error('Cloudinary upload error:', error);
          reject(error);
        }
      }
    );
  });
};
