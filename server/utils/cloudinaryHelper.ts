import { v2 as cloudinary } from 'cloudinary';

export const uploadToCloudinary = (filePath: string, folder: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
  });
};
