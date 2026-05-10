import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import '../server/config/cloudinary';
import { uploadToCloudinary } from '../server/utils/cloudinaryHelper';
import Book from '../server/models/Book';
import User from '../server/models/User';
import mongoose from 'mongoose';

/**
 * Migrates DB records only — never use server/config/db here: that module can
 * silently fall back to an in‑memory MongoDB when Atlas is unreachable,
 * making migrations look successful against an empty dataset.
 */
const connectProductionDb = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    console.error(
      'MONGO_URI is not set. Set it in .env (or export it) to your Atlas / production URI, then rerun.'
    );
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('MongoDB connected for migration.');
  } catch (err: any) {
    console.error('Could not connect to MongoDB:', err.message);
    console.error(
      '\nAtlas checklist: verify MONGO_URI, cluster status, Atlas Network Access (allow your IP or 0.0.0.0/0 temporarily), VPN/DNS/firewall.'
    );
    process.exit(1);
  }
};

type TargetField = 'fileUrl' | 'coverImage' | 'avatar';

type Candidate = {
  kind: 'book' | 'user';
  id: string;
  titleOrEmail: string;
  field: TargetField;
  currentValue: string;
};

const isCloudinaryUrl = (value: string) =>
  /^https?:\/\/res\.cloudinary\.com\//i.test(value);

const isLegacyUploadPath = (value: string) =>
  /(^\/?uploads\/)|(^https?:\/\/[^/]+\/uploads\/)/i.test(value);

const extractUploadsRelativePath = (value: string): string | null => {
  const normalized = value.replace(/\\/g, '/').trim();
  const uploadsIndex = normalized.toLowerCase().indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    return normalized.slice(uploadsIndex + '/uploads/'.length);
  }
  if (normalized.toLowerCase().startsWith('uploads/')) {
    return normalized.slice('uploads/'.length);
  }
  if (normalized.toLowerCase().startsWith('/uploads/')) {
    return normalized.slice('/uploads/'.length);
  }
  return null;
};

const folderForField = (field: TargetField): string => {
  if (field === 'fileUrl') return 'books/files';
  if (field === 'coverImage') return 'books/covers';
  return 'users/avatars';
};

const run = async () => {
  const shouldApply = process.argv.includes('--apply');
  const uploadsDir = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Uploads dir: ${uploadsDir}`);

  await connectProductionDb();

  const candidates: Candidate[] = [];

  const books = await Book.find(
    {
      $or: [{ fileUrl: { $exists: true, $ne: '' } }, { coverImage: { $exists: true, $ne: '' } }]
    },
    { fileUrl: 1, coverImage: 1, title: 1 }
  ).lean();

  for (const book of books as any[]) {
    if (book.fileUrl && !isCloudinaryUrl(book.fileUrl) && isLegacyUploadPath(book.fileUrl)) {
      candidates.push({
        kind: 'book',
        id: String(book._id),
        titleOrEmail: book.title || '(untitled)',
        field: 'fileUrl',
        currentValue: book.fileUrl
      });
    }
    if (book.coverImage && !isCloudinaryUrl(book.coverImage) && isLegacyUploadPath(book.coverImage)) {
      candidates.push({
        kind: 'book',
        id: String(book._id),
        titleOrEmail: book.title || '(untitled)',
        field: 'coverImage',
        currentValue: book.coverImage
      });
    }
  }

  const users = await User.find(
    { avatar: { $exists: true, $ne: '' } },
    { avatar: 1, email: 1 }
  ).lean();

  for (const user of users as any[]) {
    if (user.avatar && !isCloudinaryUrl(user.avatar) && isLegacyUploadPath(user.avatar)) {
      candidates.push({
        kind: 'user',
        id: String(user._id),
        titleOrEmail: user.email || '(no-email)',
        field: 'avatar',
        currentValue: user.avatar
      });
    }
  }

  if (candidates.length === 0) {
    console.log('No legacy /uploads paths found. Nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${candidates.length} legacy upload reference(s).`);

  let migrated = 0;
  let missing = 0;
  let failed = 0;

  for (const item of candidates) {
    const relativePath = extractUploadsRelativePath(item.currentValue);
    if (!relativePath) {
      console.log(`[SKIP] ${item.kind}:${item.id} ${item.field} -> could not parse path`);
      continue;
    }

    const localPath = path.join(uploadsDir, relativePath);
    if (!fs.existsSync(localPath)) {
      missing += 1;
      console.log(`[MISSING] ${item.kind}:${item.id} ${item.field} -> ${localPath}`);
      continue;
    }

    if (!shouldApply) {
      console.log(`[DRY RUN] ${item.kind}:${item.id} ${item.field} -> ${localPath}`);
      continue;
    }

    try {
      const result = await uploadToCloudinary(localPath, folderForField(item.field));
      const secureUrl = result?.secure_url as string | undefined;
      if (!secureUrl) {
        throw new Error('Cloudinary did not return secure_url');
      }

      if (item.kind === 'book') {
        await Book.findByIdAndUpdate(item.id, { [item.field]: secureUrl });
      } else {
        await User.findByIdAndUpdate(item.id, { [item.field]: secureUrl });
      }

      migrated += 1;
      console.log(`[MIGRATED] ${item.kind}:${item.id} ${item.field} -> ${secureUrl}`);
    } catch (error: any) {
      failed += 1;
      console.error(`[FAILED] ${item.kind}:${item.id} ${item.field}: ${error.message}`);
    }
  }

  console.log('--- Migration Summary ---');
  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Missing local files: ${missing}`);
  console.log(`Failed uploads: ${failed}`);
  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY RUN'}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Migration crashed:', error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors on crash path
  }
  process.exit(1);
});
