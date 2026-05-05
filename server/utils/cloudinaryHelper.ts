import cloudinary from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';

export const uploadToCloudinary = (
  buffer: Buffer, 
  folder: string, 
  resourceType: 'auto' | 'image' | 'raw' | 'video' = 'auto'
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary upload failed'));
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};
