export interface UploadCmsAssetOptions {
  folder?: string;
  metadata?: Record<string, string>;
  compressImage?: boolean;
}

const compressImageFile = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  try {
    const imageBitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(imageBitmap.width, imageBitmap.height));
    const width = Math.max(1, Math.round(imageBitmap.width * scale));
    const height = Math.max(1, Math.round(imageBitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      imageBitmap.close();
      return file;
    }

    ctx.drawImage(imageBitmap, 0, 0, width, height);
    imageBitmap.close();

    const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
      if (outputType === 'image/png') {
        canvas.toBlob(resolve, outputType);
      } else {
        canvas.toBlob(resolve, outputType, 0.82);
      }
    });

    if (!blob) {
      return file;
    }

    if (blob.size >= file.size) {
      return file;
    }

    const extension = outputType === 'image/png' ? '.png' : '.jpg';
    const name = file.name.replace(/\.[^.]+$/, extension);
    return new File([blob], name, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};

export const uploadCmsAsset = async (file: File, options: UploadCmsAssetOptions = {}) => {
  const fileToUpload = options.compressImage === false ? file : await compressImageFile(file);
  const formData = new FormData();
  formData.append('file', fileToUpload);
  formData.append('folder', options.folder ?? 'cms/uploads');
  if (options.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }

  const response = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const reason = typeof payload.error === 'string' ? payload.error : 'Failed to upload image.';
    throw new Error(reason);
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error('Failed to upload image.');
  }

  return payload.url;
};
