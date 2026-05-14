import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

/**
 * Uploads a local file to Cloudinary and deletes the local file afterwards.
 */
export const uploadToCloudinary = async (
  filePath: string, 
  folder: string, 
  resourceType: 'auto' | 'raw' | 'image' | 'video' = 'auto'
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      access_mode: 'public'
    });

    console.log(`[Cloudinary] Upload success: ${result.secure_url} (${result.resource_type})`);
    
    // Clean up local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return result;
  } catch (error: any) {
    console.error('[Cloudinary] Upload error:', error);
    
    // Clean up local file even on failure
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    throw new Error(`Cloudinary upload failed: ${error.message || 'Unknown error'}`);
  }
};

export const getCloudinaryUrl = (publicId: string, resourceType: 'raw' | 'image' = 'raw'): string => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME not configured');
  }
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`;
};

/**
 * Generates a signed URL for a Cloudinary resource.
 * Required for resources with access_mode 'authenticated' or 'private'.
 */
export const getSignedCloudinaryUrl = (publicId: string, resourceType: 'raw' | 'image' = 'raw'): string => {
  if (!isCloudinaryConfigured()) {
    return getCloudinaryUrl(publicId, resourceType);
  }

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    type: 'upload'
  });
};

