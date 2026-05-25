function getReactFiber(dom) {
    const key = Object.keys(dom).find(key => key.startsWith('__reactFiber$'));
    return key ? dom[key] : null;
}

function findTweetData(fiber) {
    let curr = fiber;
    while (curr) {
        const props = curr.memoizedProps;

        if (props && props.tweet) {
            if (props.tweet.legacy) {
                return props.tweet.legacy;
            }
            return props.tweet;
        }

        if (props && props.legacy && props.legacy.extended_entities) {
            return props.legacy;
        }
        
        curr = curr.return;
    }
    return null;
}

window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin || event.data.type !== 'X_DOWNLOAD_REQUEST') return;

    const { targetId } = event.data;
    const tweetElement = document.querySelector(`[data-x-downloader-target="${targetId}"]`);

    if (!tweetElement) {
        return;
    }

    const fiber = getReactFiber(tweetElement);
    const parentData = findTweetData(fiber);

    const allMedia = [];
    const seenMedia = new Set();

    const addMediaFrom = (data) => {
        if (!data || !data.extended_entities || !data.extended_entities.media) return;
        for (const m of data.extended_entities.media) {
            const key = m.id_str || m.media_url_https || m.media_url;
            if (seenMedia.has(key)) continue;
            seenMedia.add(key);
            allMedia.push(m);
        }
    };

    addMediaFrom(parentData);

    const quotedWrappers = tweetElement.querySelectorAll('div[role="link"]');
    for (const wrapper of quotedWrappers) {
        const wrapperFiber = getReactFiber(wrapper);
        if (!wrapperFiber) continue;
        addMediaFrom(findTweetData(wrapperFiber));
    }

    const mediaUrls = [];

    if (allMedia.length > 0) {
        allMedia.forEach(media => {
            if (media.type === 'video' || media.type === 'animated_gif') {
                const variants = media.video_info.variants
                    .filter(v => v.content_type === 'video/mp4')
                    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                
                if (variants.length > 0) {
                    mediaUrls.push({ 
                        type: 'video', 
                        url: variants[0].url,
                        thumbnail: media.media_url_https 
                    });
                }
            } else if (media.type === 'photo') {
                const imgUrl = media.media_url_https + '?format=jpg&name=orig';
                mediaUrls.push({ 
                    type: 'image', 
                    url: imgUrl,
                    thumbnail: media.media_url_https + '?format=jpg&name=small'
                });
            }
        });
    }

    window.postMessage({
        type: 'X_DOWNLOAD_RESPONSE',
        targetId: targetId,
        media: mediaUrls
    }, '*');
});