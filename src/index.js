export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/download' && request.method === 'POST') {
      try {
        const body = await request.json();
        const targetUrl = body.url?.trim();

        if (!targetUrl) {
          return new Response(JSON.stringify({ error: 'URL을 입력해 주세요.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        let platform = null;
        if (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be')) platform = 'youtube';
        else if (targetUrl.includes('tiktok.com')) platform = 'tiktok';
        else if (targetUrl.includes('twitter.com') || targetUrl.includes('x.com')) platform = 'twitter';
        else if (targetUrl.includes('instagram.com')) platform = 'instagram';
        else if (targetUrl.includes('bsky.app')) platform = 'bluesky';
        else if (targetUrl.includes('facebook.com') || targetUrl.includes('fb.watch')) platform = 'facebook';

        if (!platform) {
          return new Response(JSON.stringify({ error: '지원하지 않는 URL입니다.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const externalTools = {
          youtube: 'https://www.y2mate.com',
          tiktok: 'https://ssstik.io',
          twitter: 'https://twdown.net',
          instagram: 'https://snapinsta.app',
          facebook: 'https://fdown.net',
        };

        if (platform === 'bluesky') {
          const match = targetUrl.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?]+)/);
          if (match) {
            const handle = match[1];
            const postId = match[2];
            const resolveRes = await fetch('https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=' + handle);
            const resolve = await resolveRes.json();
            const did = resolve.did;
            const postRes = await fetch('https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=at://' + did + '/app.bsky.feed.post/' + postId);
            const post = await postRes.json();
            const embed = post.thread?.post?.embed;
            let mediaUrl = null;
            let type = 'unknown';
            if (embed?.images?.length > 0) {
              mediaUrl = embed.images[0].fullsize;
              type = 'image';
            } else if (embed?.video) {
              mediaUrl = embed.video.playlist;
              type = 'video';
            }
            if (mediaUrl) {
              return new Response(JSON.stringify({
                platform: 'Bluesky',
                title: post.thread?.post?.record?.text || 'Bluesky 게시물',
                author: post.thread?.post?.author?.displayName || handle,
                thumbnail: embed?.images?.[0]?.thumb || null,
                mediaUrl,
                type,
              }), { headers: { 'Content-Type': 'application/json' } });
            }
          }
        }

        if (platform === 'tiktok') {
          try {
            const pageRes = await fetch(targetUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            const html = await pageRes.text();
            let videoUrl = null;
            const patterns = [
              /"downloadAddr":"([^"]+)"/,
              /"playAddr":"([^"]+)"/,
              /property="og:video" content="([^"]+)"/,
            ];
            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match) {
                videoUrl = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
                break;
              }
            }
            const thumbMatch = html.match(/property="og:image" content="([^"]+)"/);
            const thumbnail = thumbMatch ? thumbMatch[1] : null;
            const titleMatch = html.match(/property="og:title" content="([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : 'TikTok 영상';

            if (videoUrl) {
              return new Response(JSON.stringify({
                platform: 'TikTok',
                title,
                author: null,
                thumbnail,
                mediaUrl: videoUrl,
                type: 'video',
              }), { headers: { 'Content-Type': 'application/json' } });
            }
          } catch (e) {
            // Fall through
          }
        }

        const platformNames = {
          youtube: 'YouTube',
          tiktok: 'TikTok',
          twitter: 'X (Twitter)',
          instagram: 'Instagram',
          facebook: 'Facebook',
        };

        return new Response(JSON.stringify({
          platform: platformNames[platform] || platform,
          title: platform + ' 미디어',
          author: null,
          thumbnail: null,
          mediaUrl: null,
          type: 'unknown',
          note: '이 플랫폼은 외부 도구를 사용하세요.',
          externalTool: externalTools[platform],
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (e) {
        return new Response(JSON.stringify({ error: '오류가 발생했습니다: ' + e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve HTML from base64
    const html = atob(HTML_B64);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

const HTML_B64 = '` + b64 + `';
