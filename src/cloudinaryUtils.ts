/**
 * Utility functions for optimizing Cloudinary images.
 * Generates responsive srcset and dynamic width transformations
 * while preserving quality (q_auto) and modern formats (f_auto).
 */

export function getOptimizedCloudinaryUrl(url: string, width?: number): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  const prefix = url.substring(0, uploadIndex + 8); // includes '/upload/'
  const rest = url.substring(uploadIndex + 8);

  const parts = rest.split('/');
  let pathAfterTransformations = rest;

  // Check if first segment contains previous transformation parameters
  if (
    parts.length > 1 &&
    (parts[0].includes('f_auto') ||
      parts[0].includes('q_auto') ||
      parts[0].includes('w_') ||
      parts[0].includes('c_') ||
      parts[0].includes('dpr_'))
  ) {
    pathAfterTransformations = parts.slice(1).join('/');
  }

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (width && width > 0) {
    // c_limit scales down proportionally to the specified width if larger, without cropping or distortion
    transforms.push('c_limit', `w_${Math.round(width)}`);
  }

  return `${prefix}${transforms.join(',')}/${pathAfterTransformations}`;
}

export function getCloudinarySrcSet(
  url: string,
  widths: number[] = [380, 520, 720, 960]
): string | undefined {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return undefined;
  }

  return widths
    .map((w) => `${getOptimizedCloudinaryUrl(url, w)} ${w}w`)
    .join(', ');
}
