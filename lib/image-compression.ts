/**
 * Client-side image compression utility for DNA AI Platform.
 * Prevents HTTP 413 "Request Entity Too Large" by automatically resizing and compressing
 * large screenshots and camera photos before sending them to the API.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // Only process images
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // If already small (< 1MB) and not a heavy PNG, no compression needed
  if (file.size <= 1024 * 1024 && !file.type.includes("png")) {
    return file;
  }

  // Ensure running in browser
  if (typeof window === "undefined") {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;

        if (width === 0 || height === 0) {
          resolve(file);
          return;
        }

        // Scale down proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compression didn't reduce size, keep original
              resolve(file);
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

/**
 * Creates a lightweight base64 thumbnail (< 25KB) suitable for storage in History database and localStorage.
 */
export async function createThumbnailDataUrl(
  file: File,
  maxDimension = 360,
  quality = 0.65
): Promise<string> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return "";
  }

  return new Promise((resolve) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        if (width === 0 || height === 0) {
          resolve("");
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve("");
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve("");
      };

      img.src = objectUrl;
    } catch {
      resolve("");
    }
  });
}
