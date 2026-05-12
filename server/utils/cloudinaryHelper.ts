import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = (filePath: string, folder: string, resourceType: 'auto' | 'raw' | 'image' | 'video' = 'auto'): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { 
        folder, 
        resource_type: resourceType,
        type: 'upload', 
        access_mode: 'public',
        use_filename: true,
        unique_filename: true,
        overwrite: true
      },
      (error, result) => {
        if (result) {
          console.log(`[Cloudinary] Upload success: ${result.secure_url} (${result.resource_type})`);
          resolve(result);
        } else {
          console.error('Cloudinary upload error:', error);
          reject(error);
        }
      }
    );
  });
};

export const getCloudinaryUrl = (publicId: string, resourceType: 'raw' | 'image' = 'raw'): string => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME not configured');
  }
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`;
};
