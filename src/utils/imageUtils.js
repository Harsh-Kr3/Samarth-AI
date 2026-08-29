export function imageToBase64(dataUrl) {
  return dataUrl.split(',')[1];
}

export function getMimeType(dataUrl) {
  const match = dataUrl.match(/data:([^;]+);/);
  return match ? match[1] : 'image/jpeg';
}

export function resizeImageToBase64(dataUrl, maxWidth = 1024, maxHeight = 1024, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}
