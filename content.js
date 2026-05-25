const PICKER_STYLES = `
.x-media-picker-overlay {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.6); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(2px);
}
.x-media-picker-modal {
    background: #000; border: 1px solid #333; border-radius: 16px;
    padding: 20px; width: 320px; max-width: 90%;
    box-shadow: 0 8px 30px rgba(255, 255, 255, 0.1);
    color: #fff; font-family: sans-serif;
}
.x-media-picker-header {
    font-size: 18px; font-weight: bold; margin-bottom: 15px;
    text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px;
}
.x-media-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px;
}
.x-media-item {
    position: relative; cursor: pointer; border-radius: 8px; overflow: hidden;
    aspect-ratio: 1; border: 2px solid transparent; transition: all 0.2s;
}
.x-media-item.selected {
    border-color: #1d9bf0; opacity: 1;
}
.x-media-item:not(.selected) {
    opacity: 0.5; filter: grayscale(0.5);
}
.x-media-item img {
    width: 100%; height: 100%; object-fit: cover;
}
.x-media-number {
    position: absolute; top: 5px; left: 5px;
    background: rgba(0, 0, 0, 0.7); color: #fff;
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: bold;
}
.x-picker-actions {
    display: flex; gap: 10px;
}
.x-btn {
    flex: 1; padding: 10px; border-radius: 20px; border: none;
    font-weight: bold; cursor: pointer; font-size: 14px;
    display: flex; align-items: center; justify-content: center;
}
.x-btn-primary { background: #1d9bf0; color: #fff; }
.x-btn-primary:hover { background: #1a8cd8; }
.x-btn-secondary { background: #eff3f4; color: #0f1419; }
.x-btn-secondary:hover { background: #d7dbdc; }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = PICKER_STYLES;
document.head.appendChild(styleSheet);

const DOWNLOAD_ICON_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1xvli5t r-1hdv0qi">
    <g>
        <path d="M12 15.586l-4.293-4.293-1.414 1.414L12 18.414l5.707-5.707-1.414-1.414z"></path>
        <path d="M11 0.5h2v15.5h-2z"></path>
    </g>
</svg>
`;

try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
} catch (e) {
    console.log("X Downloader: Extension updated. Please refresh the page.");
}

function createMediaPicker(mediaItems) {
    const overlay = document.createElement('div');
    overlay.className = 'x-media-picker-overlay';

    const modal = document.createElement('div');
    modal.className = 'x-media-picker-modal';
    
    const header = document.createElement('div');
    header.className = 'x-media-picker-header';
    header.innerText = 'Select Media to Download';
    
    const grid = document.createElement('div');
    grid.className = 'x-media-grid';

    const selectedIndices = new Set(mediaItems.map((_, i) => i));

    mediaItems.forEach((item, index) => {
        const cell = document.createElement('div');
        cell.className = 'x-media-item selected';
        
        const img = document.createElement('img');
        img.src = item.thumbnail || item.url;
        
        const numBadge = document.createElement('div');
        numBadge.className = 'x-media-number';
        numBadge.innerText = index + 1;

        cell.appendChild(img);
        cell.appendChild(numBadge);

        cell.onclick = () => {
            if (selectedIndices.has(index)) {
                selectedIndices.delete(index);
                cell.classList.remove('selected');
            } else {
                selectedIndices.add(index);
                cell.classList.add('selected');
            }
        };

        grid.appendChild(cell);
    });

    const actions = document.createElement('div');
    actions.className = 'x-picker-actions';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'x-btn x-btn-secondary';
    btnCancel.innerText = 'Cancel';
    btnCancel.onclick = () => document.body.removeChild(overlay);

    const btnDownload = document.createElement('button');
    btnDownload.className = 'x-btn x-btn-primary';
    btnDownload.innerText = 'Download';
    btnDownload.onclick = () => {
        const urlsToDownload = [];
        selectedIndices.forEach(index => {
            urlsToDownload.push(mediaItems[index].url);
        });

        if (urlsToDownload.length > 0) {
            chrome.runtime.sendMessage({
                action: "download_media",
                urls: urlsToDownload
            });
        }
        document.body.removeChild(overlay);
    };

    actions.appendChild(btnCancel);
    actions.appendChild(btnDownload);

    modal.appendChild(header);
    modal.appendChild(grid);
    modal.appendChild(actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function hasMedia(tweet) {
    const photo = tweet.querySelector('[data-testid="tweetPhoto"]');
    const video = tweet.querySelector('[data-testid="videoPlayer"]');
    const rawVideo = tweet.querySelector('video');
    return photo || video || rawVideo;
}

function handleDownload(tweetElement) {
    const uniqueId = Date.now().toString() + Math.random().toString().slice(2);
    tweetElement.setAttribute('data-x-downloader-target', uniqueId);

    let fallbackTimeout;

    const responseHandler = (event) => {
        if (event.source !== window || 
            event.origin !== window.location.origin ||
            event.data.type !== 'X_DOWNLOAD_RESPONSE' || 
            event.data.targetId !== uniqueId) {
            return;
        }

        clearTimeout(fallbackTimeout);
        window.removeEventListener('message', responseHandler);
        tweetElement.removeAttribute('data-x-downloader-target');

        const mediaItems = event.data.media;

        if (!mediaItems || mediaItems.length === 0) {
            alert("No media found (or media is protected).");
            return;
        }

        if (mediaItems.length === 1) {
            chrome.runtime.sendMessage({
                action: "download_media",
                urls: [mediaItems[0].url]
            });
        } else {
            createMediaPicker(mediaItems);
        }
    };

    window.addEventListener('message', responseHandler);
    
    fallbackTimeout = setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        tweetElement.removeAttribute('data-x-downloader-target');
    }, 5000);

    window.postMessage({
        type: 'X_DOWNLOAD_REQUEST',
        targetId: uniqueId
    }, window.location.origin);
}

function addDownloadButton(tweet) {
    if (!hasMedia(tweet)) return;

    const replyBtn = tweet.querySelector('[data-testid="reply"]');
    if (!replyBtn) return;

    const actionBar = replyBtn.closest('div[role="group"]');
    if (!actionBar) return;

    let buttonContainer = actionBar.querySelector('.x-media-downloader-btn');

    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'css-1dbjc4n r-18u37iz r-1h0z5md x-media-downloader-btn';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.alignItems = 'center';
        
        buttonContainer.style.marginLeft = 'auto'; 
        buttonContainer.style.marginRight = '4px';
        buttonContainer.style.transform = 'translate(6px, 2px)';

        const innerDiv = document.createElement('div');
        innerDiv.className = 'css-1dbjc4n r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1xvli5t r-1hdv0qi';
        innerDiv.style.height = '35px';
        innerDiv.style.width = '35px';
        innerDiv.style.borderRadius = '9999px';
        innerDiv.style.display = 'flex';
        innerDiv.style.alignItems = 'center';
        innerDiv.style.justifyContent = 'center';
        innerDiv.style.transition = 'background-color 0.2s';
        innerDiv.style.cursor = 'pointer'; 
        innerDiv.style.margin = '0';

        innerDiv.onmouseover = () => innerDiv.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        innerDiv.onmouseout = () => innerDiv.style.backgroundColor = 'transparent';

        innerDiv.innerHTML = DOWNLOAD_ICON_SVG;
        
        const svg = innerDiv.querySelector('svg');
        svg.style.height = '1.25rem';
        svg.style.fill = 'rgb(113, 118, 123)';

        innerDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            handleDownload(tweet);
        });

        buttonContainer.appendChild(innerDiv);
    }

    const getAnchorContainer = (targetBtn) => {
        let current = targetBtn;
        while (current && current.parentElement !== actionBar) {
            current = current.parentElement;
        }
        return current;
    };

    const bookmarkBtn = actionBar.querySelector('[data-testid="bookmark"]') || 
                        actionBar.querySelector('[data-testid="removeBookmark"]');
    
    const shareBtn = actionBar.querySelector('[data-testid="share"]') || 
                     actionBar.querySelector('[aria-label="Share post"]') || 
                     actionBar.querySelector('[aria-label="Share"]');

    const timeEls = tweet.querySelectorAll('time');
    const isDetailedView = Array.from(timeEls).some(t => t.textContent.includes('·'));

    if (isDetailedView) {
        if (shareBtn) {
            const anchor = getAnchorContainer(shareBtn);
            if (anchor) {
                actionBar.insertBefore(buttonContainer, anchor);
                return;
            }
        }
    }

    if (bookmarkBtn) {
        const anchor = getAnchorContainer(bookmarkBtn);
        if (anchor) {
            actionBar.insertBefore(buttonContainer, anchor);
            return;
        }
    }

    if (shareBtn) {
        const anchor = getAnchorContainer(shareBtn);
        if (anchor) actionBar.insertBefore(buttonContainer, anchor);
    } else {
        if (buttonContainer.parentElement !== actionBar) {
            actionBar.appendChild(buttonContainer);
        }
    }
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                const tweets = node.querySelectorAll ? node.querySelectorAll('[data-testid="tweet"]') : [];
                tweets.forEach(addDownloadButton);
                
                if (node.getAttribute && node.getAttribute('data-testid') === 'tweet') {
                    addDownloadButton(node);
                }

                if (node.querySelector('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]') ||
                    node.getAttribute('data-testid') === 'tweetPhoto' || 
                    node.getAttribute('data-testid') === 'videoPlayer') {
                    
                    const parentTweet = node.closest('[data-testid="tweet"]');
                    if (parentTweet) addDownloadButton(parentTweet);
                }

                if (node.querySelector('[data-testid="reply"], [data-testid="share"], [data-testid="bookmark"]') ||
                    node.getAttribute('data-testid') === 'reply' ||
                    node.getAttribute('data-testid') === 'share') {
                    
                    const parentTweet = node.closest('[data-testid="tweet"]');
                    if (parentTweet) addDownloadButton(parentTweet);
                }
            }
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('[data-testid="tweet"]').forEach(addDownloadButton);