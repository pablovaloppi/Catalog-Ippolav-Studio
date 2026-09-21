/**
 * Utility functions for optimizing Cloudinary images.
 * Generates responsive srcset and dynamic width transformations
 * while preserving quality (q_auto) and modern formats (f_auto).
 */

/**
 * Utility functions for optimizing Cloudinary images with high visual fidelity.
 * Delivers modern formats (AVIF/WebP) via f_auto, preserves high quality (q_auto:good / q_auto:best)
 * avoiding over-compression, and generates generous responsive srcSet breakpoints
 * tailored to real CSS layout dimensions and 1x/2x/3x Retina viewports.
 */

export function getOptimizedCloudinaryUrl(
  url: string,
  width?: number,
  quality: 'good' | 'best' = 'good'
): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  const prefix = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const rest = url.substring(uploadIndex + 8);

  const parts = rest.split('/');
  let startIndex = 0;

  // Skip any existing transformation segments right after /upload/
  // A version segment typically starts with 'v' followed only by digits (e.g. v1789646081)
  while (startIndex < parts.length - 1) {
    const segment = parts[startIndex];
    if (/^v\d+$/.test(segment)) {
      // Reached the version segment, stop skipping
      break;
    }
    // If it contains transformation markers, skip it
    if (
      segment.includes('f_auto') ||
      segment.includes('q_auto') ||
      segment.includes('w_') ||
      segment.includes('h_') ||
      segment.includes('c_') ||
      segment.includes('dpr_') ||
      segment.includes('q_')
    ) {
      startIndex++;
    } else {
      break;
    }
  }

  const cleanPath = parts.slice(startIndex).join('/');

  // Quality mode: q_auto:good preserves rich textures and sharp figure details without compression artifacts.
  // q_auto:best delivers pristine master quality for close-up inspection.
  const qualityTransform = quality === 'best' ? 'q_auto:best' : 'q_auto:good';
  const transforms: string[] = ['f_auto', qualityTransform];

  if (width && width > 0) {
    // c_limit scales down proportionally if larger than width, never upscales or crops
    transforms.push('c_limit', `w_${Math.round(width)}`);
  }

  return `${prefix}${transforms.join(',')}/${cleanPath}`;
}

export function getCloudinarySrcSet(
  url: string,
  widths: number[] = [480, 720, 960, 1200, 1600],
  quality: 'good' | 'best' = 'good'
): string | undefined {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return undefined;
  }

  return widths
    .map((w) => `${getOptimizedCloudinaryUrl(url, w, quality)} ${w}w`)
    .join(', ');
}

/**
 * Returns the highest resolution original/uncompressed image URL.
 * Strips out any downscaling, width/height limits, or compression filters.
 */
export function getOriginalCloudinaryUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  const prefix = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const rest = url.substring(uploadIndex + 8);

  const parts = rest.split('/');
  let startIndex = 0;

  while (startIndex < parts.length - 1) {
    const segment = parts[startIndex];
    if (/^v\d+$/.test(segment)) {
      break;
    }
    if (
      segment.includes('f_auto') ||
      segment.includes('q_auto') ||
      segment.includes('w_') ||
      segment.includes('h_') ||
      segment.includes('c_') ||
      segment.includes('dpr_') ||
      segment.includes('q_')
    ) {
      startIndex++;
    } else {
      break;
    }
  }

  const cleanPath = parts.slice(startIndex).join('/');
  return `${prefix}${cleanPath}`;
}

/**
 * Downloads an image file to the user's browser with the maximum possible fidelity.
 */
export async function downloadImageAsFile(url: string, filename: string): Promise<boolean> {
  const originalUrl = getOriginalCloudinaryUrl(url);
  try {
    const response = await fetch(originalUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
    return true;
  } catch (err) {
    console.warn("Direct blob download failed, falling back to direct anchor download:", err);
    try {
      const link = document.createElement('a');
      link.href = originalUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (fallbackErr) {
      console.error("Download fallback failed:", fallbackErr);
      return false;
    }
  }
}

