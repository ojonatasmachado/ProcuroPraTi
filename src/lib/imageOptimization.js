const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const TARGET_BYTES = 1024 * 1024;
const MAX_EDGE = 1920;

const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => resolve({ image, url });
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Não foi possível processar esta imagem. Use JPG, PNG ou WebP.'));
  };
  image.src = url;
});

const canvasToBlob = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível reduzir a imagem.')),
    'image/webp',
    quality,
  );
});

export const optimizeImageForUpload = async (file) => {
  if (!file?.type?.startsWith('image/')) throw new Error('Selecione uma imagem válida.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('A imagem original deve ter no máximo 15 MB.');

  const { image, url } = await loadImage(file);
  try {
    const initialScale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
    let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
    let result = null;

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const quality = Math.max(0.62, 0.86 - attempt * 0.04);
      result = await canvasToBlob(canvas, quality);
      if (result.size <= TARGET_BYTES) break;
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }

    if (!result || result.size > 1.5 * 1024 * 1024) {
      throw new Error('A imagem não pôde ser reduzida o suficiente. Escolha outra foto.');
    }

    const baseName = (file.name || 'imagem').replace(/\.[^.]+$/, '');
    return new File([result], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
};
