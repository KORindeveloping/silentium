import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = (filePath: string, folder: string, resourceType: 'auto' | 'raw' | 'image' | 'video' = 'auto'): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: resourceType },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
  });
};
