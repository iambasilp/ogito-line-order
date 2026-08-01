/**
 * Utility to compress an image file and convert it to a Base64 string.
 * This is used to ensure profile images don't bloat the MongoDB database.
 * 
 * @param file The image file from an input element
 * @param maxWidth The maximum width to scale down to (default: 300)
 * @param maxHeight The maximum height to scale down to (default: 300)
 * @param quality The JPEG compression quality (0 to 1, default: 0.8)
 * @returns A promise that resolves to the compressed Base64 string
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        // Create canvas and draw the resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Export to highly compressed base64 JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = (error) => reject(error);
    };
    
    reader.onerror = (error) => reject(error);
  });
};
