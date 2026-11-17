import { createClient } from '@/lib/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Uploads product image or acrylic design mockup to Supabase Storage.
 * Includes client-side mime validation, size limits, and offline fallback.
 */
export async function uploadProductImage(
  file: File,
  bucket: string = 'product-images'
): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file format (${file.type}). Allowed formats: JPEG, PNG, WebP, SVG.`,
    };
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: `File exceeds maximum 5MB size limit (${(file.size / 1024 / 1024).toFixed(1)}MB).`,
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo = !supabaseUrl || supabaseUrl.includes('placeholder');

  // Offline demo mode fallback: return simulated asset URL
  if (isDemo) {
    const fakePath = `demo/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    return {
      success: true,
      url: `/mock-assets/${fakePath}`,
      filePath: fakePath,
    };
  }

  try {
    const supabase = createClient();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `products/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Storage upload failed.',
      };
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData.publicUrl,
      filePath: data.path,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error occurred while uploading to storage.',
    };
  }
}
