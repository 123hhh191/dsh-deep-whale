/** Image compression for uploaded backgrounds (canvas → data URL). */

const MAX_DIMENSION = 1920
const QUALITY = 0.85

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to decode image'))
    image.src = url
  })
}

/**
 * Downscale a picked image file to a WebP/JPEG data URL.
 * @param file - the user-picked image file.
 * @returns a compressed data URL usable as a CSS background.
 */
export async function compressImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('canvas unavailable')
    context.drawImage(image, 0, 0, width, height)
    try {
      return canvas.toDataURL('image/webp', QUALITY)
    } catch {
      return canvas.toDataURL('image/jpeg', QUALITY)
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Read a text file (scheme import). */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('failed to read file'))
    reader.readAsText(file)
  })
}
