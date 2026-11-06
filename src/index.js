const HTML_CONTENT = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SNS 미디어 다운로드 도구 — 인스타·틱톡·X·페이스북·블루스카이</title>
<meta name="description" content="인스타그램, 틱톡, X(트위터), 페이스북, 블루스카이에서 영상과 사진을 다운로드하는 방법을 안내합니다.">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .container {
    background: white;
    border-radius: 16px;
    padding: 40px;
    max-width: 600px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  h1 { font-size: 24px; margin-bottom: 8px; color: #333; }
  .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
  .platforms { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .platform { padding: 6px 12px; border-radius: 20px; font-size: 12px; background: #f0f0f0; color: #555; }
  .tool-list { margin: 20px 0; }
  .tool-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }
  .tool-item h3 { font-size: 16px; margin-bottom: 8px; color: #333; }
  .tool-item p { font-size: 13px; color: #666; margin-bottom: 8px; }
  .tool-link {
    display: inline-block;
    padding: 8px 16px;
    background: #667eea;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 13px;
  }
  .tool-link:hover { background: #5a6fd6; }
  .footer {
    margin-top: 24px;
    text-align: center;
    font-size: 12px;
    color: #999;
  }
  .footer a { color: #667eea; text-decoration: none; }
</style>
</head>
<body>
  <div class="container">
    <h1>SNS 미디어 다운로드</h1>
    <p class="subtitle">인스타그램, 틱톡, X, 페이스북, 블루스카이에서 영상과 사진을 다운로드하는 방법을 안내합니다</p>

    <div class="platforms">
      <span class="platform">Instagram</span>
      <span class="platform">TikTok</span>
      <span class="platform">X (Twitter)</span>
      <span class="platform">Facebook</span>
      <span class="platform">Bluesky</span>
    </div>

    <div class="tool-list">
      <div class="tool-item">
        <h3>📸 인스타그램</h3>
        <p>게시물, 릴스, 스토리 다운로드</p>
        <a class="tool-link" href="https://snapinsta.app" target="_blank">snapinsta.app</a>
      </div>
      <div class="tool-item">
        <h3>🎵 틱톡</h3>
        <p>워터마크 없는 영상 다운로드</p>
        <a class="tool-link" href="https://ssstik.io" target="_blank">ssstik.io</a>
      </div>
      <div class="tool-item">
        <h3>🐦 X (트위터)</h3>
        <p>영상, GIF, 이미지 다운로드</p>
        <a class="tool-link" href="https://twdown.net" target="_blank">twdown.net</a>
      </div>
      <div class="tool-item">
        <h3>📘 페이스북</h3>
        <p>영상 다운로드</p>
        <a class="tool-link" href="https://fdown.net" target="_blank">fdown.net</a>
      </div>
      <div class="tool-item">
        <h3>🦋 블루스카이</h3>
        <p>이미지, 영상 다운로드</p>
        <a class="tool-link" href="https://bsky.app" target="_blank">bsky.app</a>
      </div>
    </div>

    <div class="footer">
      <p>공개 게시물만 지원됩니다. 저작권을 존중해 주세요.</p>
      <p><a href="https://issuedayissue.blogspot.com" target="_blank">IssueIssue 블로그</a></p>
    </div>
  </div>
</body>
</html>`;

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
            const resolveRes = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
            const resolve = await resolveRes.json();
            const did = resolve.did;
            const postRes = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=at://${did}/app.bsky.feed.post/${postId}`);
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

        return new Response(JSON.stringify({
          platform: platform.charAt(0).toUpperCase() + platform.slice(1),
          title: `${platform} 미디어`,
          author: null,
          thumbnail: null,
          mediaUrl: null,
          type: 'unknown',
          note: `이 플랫폼은 외부 도구를 사용하세요.`,
          externalTool: externalTools[platform],
        }), { headers: { 'Content-Type': 'application/json' } });

      } catch (e) {
        return new Response(JSON.stringify({ error: `오류가 발생했습니다: ${e.message}` }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve HTML for all other routes
    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};