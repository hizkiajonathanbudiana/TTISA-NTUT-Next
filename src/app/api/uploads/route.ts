import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env.server';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const errorResponse = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

const normalizeFolder = (value: string | null) => {
  const folder = value?.trim() ?? '';
  if (!folder) {
    return 'cms/uploads';
  }

  if (!/^[a-zA-Z0-9/_-]+$/.test(folder) || folder.includes('..') || folder.startsWith('/')) {
    throw new Error('Invalid upload folder.');
  }

  return folder.replace(/^\/+|\/+$/g, '');
};

export async function POST(request: Request) {
  try {
    if (!serverEnv?.CLOUDINARY_API_KEY || !serverEnv?.CLOUDINARY_API_SECRET || !serverEnv?.CLOUDINARY_CLOUD_NAME) {
      return errorResponse('Cloudinary is not configured.', 500);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return errorResponse('Missing upload file.', 400);
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return errorResponse('File is too large. Please upload an image under 10 MB.', 400);
    }

    const folderEntry = formData.get('folder');
    const folder = normalizeFolder(typeof folderEntry === 'string' ? folderEntry : null);

    // Generate Cloudinary upload signature
    const timestamp = Math.floor(Date.now() / 1000);
      const signatureString = `folder=${folder}&timestamp=${timestamp}&upload_preset=ml_default${serverEnv.CLOUDINARY_API_SECRET}`;
    const signature = createHash('sha1').update(signatureString).digest('hex');

    // Prepare upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('folder', folder);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('upload_preset', 'ml_default');
    uploadFormData.append('api_key', serverEnv.CLOUDINARY_API_KEY);
    uploadFormData.append('signature', signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${serverEnv.CLOUDINARY_CLOUD_NAME}/image/upload`;
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(
        typeof errorData.error === 'string'
          ? errorData.error
          : `Cloudinary upload failed with status ${uploadResponse.status}`
      );
    }

    const uploadData = (await uploadResponse.json()) as Record<string, unknown>;
    const url = typeof uploadData.secure_url === 'string' ? uploadData.secure_url : null;
    const publicId = typeof uploadData.public_id === 'string' ? uploadData.public_id : null;

    if (!url) {
      throw new Error('Cloudinary upload successful but missing secure_url.');
    }

    return NextResponse.json({ url, path: publicId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image.';
    return errorResponse(message, 400);
  }
}
