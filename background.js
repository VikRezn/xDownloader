chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "download_media") {
    
    chrome.storage.local.get(['downloadMode', 'subfolderName'], (settings) => {
      
      const mode = settings.downloadMode || 'direct';
      let folderName = (settings.subfolderName || '').trim().replace(/^\/+|\/+$/g, '');

      request.urls.forEach((rawUrl) => {
        const urlObj = new URL(rawUrl);
        const path = urlObj.pathname;
        
        let ext = 'jpg';
        const formatParam = urlObj.searchParams.get('format');
        
        if (path.endsWith('.mp4') || rawUrl.includes('.mp4')) {
          ext = 'mp4';
        } else if (formatParam) {
          ext = formatParam;
        } else if (path.endsWith('.png')) {
          ext = 'png';
        }
        
        const baseFilename = `x_media_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        
        let finalFilename = baseFilename;
        let triggerSaveAs = false;

        if (mode === 'subfolder' && folderName) {
            finalFilename = `${folderName}/${baseFilename}`;
        } else if (mode === 'saveAs') {
            triggerSaveAs = true;
        }
        chrome.downloads.download({
          url: rawUrl,
          filename: finalFilename,
          saveAs: triggerSaveAs
        });
      });
    });

    return true; 
  }
});