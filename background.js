function backgroundElem(elem) {
    let bg = document.getElementById('background');
    bg.appendChild(elem);
  }
  
  const dpr = window.devicePixelRatio || 1;
  let fps = 24;
  let max_size = 4000 * 1e6 / 4; // 4GB max
  
  const ext_map = {
    'mp4': 'video/mp4',
    'mpeg4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'ogv': 'video/ogg',
    'webm': 'video/webm',
    'gif': 'image/gif',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'aac': 'audio/aac',
    'mp3': 'audio/mpeg',
    'oga': 'audio/ogg',
    'wav': 'audio/wav',
    'weba': 'audio/webm',
  };
  