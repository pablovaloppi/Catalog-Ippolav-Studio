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

