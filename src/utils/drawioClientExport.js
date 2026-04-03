export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl)
  return response.blob()
}

export async function exportPayloadToBlob(payload, fallbackMime) {
  const text = String(payload || '')
  if (text.startsWith('data:')) return dataUrlToBlob(text)
  return new Blob([text], { type: fallbackMime })
}

export function convertPngDataUrlToJpeg(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('浏览器不支持 JPEG 转换'))
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.95))
    }
    image.onerror = () => reject(new Error('PNG 转换 JPEG 失败'))
    image.src = dataUrl
  })
}
