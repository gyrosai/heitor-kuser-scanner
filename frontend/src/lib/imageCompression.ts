/**
 * Comprime imagem do client antes de armazenar no IndexedDB / enviar pro backend.
 * Reduz quota usada (60 fotos × ~250KB = 15MB) e payload por chunk (5 × ~250KB = 1.25MB).
 *
 * Não usar pra scan single — CardCapture já tem sua própria pipeline.
 */
export async function compressImageForUpload(
  file: File | Blob,
  maxSize: number = 1200,
  quality: number = 0.75,
): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context indisponível");
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL("image/jpeg", quality);
  const base64 = out.split(",")[1];
  if (!base64) throw new Error("Falha ao codificar JPEG");
  return base64;
}

function readAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    img.src = src;
  });
}
