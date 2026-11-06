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

        // Bluesky: public API
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

        // TikTok: extract video URL from page
        if (platform === 'tiktok') {
          try {
            const pageRes = await fetch(targetUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            const html = await pageRes.text();
            
            // Try to extract video URL from various patterns
            let videoUrl = null;
            const patterns = [
              /"downloadAddr":"([^"]+)"/,
              /"playAddr":"([^"]+)"/,
              /property="og:video" content="([^"]+)"/,
              /"video":\{"id":"[^"]+","url":"([^"]+)"/,
            ];
            for (const pattern of patterns) {
              const match = html.match(pattern);
              if (match) {
                videoUrl = match[1].replace(/\\u002F/g, '/').replace(/\\\//g, '/');
                break;
              }
            }

            // Get thumbnail
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
            // Fall through to external tool
          }
        }

        // Twitter/X: try oEmbed
        if (platform === 'twitter') {
          try {
            const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(targetUrl)}`;
            const oembedRes = await fetch(oembedUrl);
            const oembed = await oembedRes.json();
            // Twitter doesn't provide direct media URL via oEmbed
            // Return basic info
            return new Response(JSON.stringify({
              platform: 'X (Twitter)',
              title: oembed.author_name || 'X 게시물',
              author: oembed.author_name,
              thumbnail: null,
              mediaUrl: null,
              type: 'unknown',
              note: 'X(Twitter) 미디어는 외부 도구를 사용하세요.',
              externalTool: 'https://twdown.net',
            }), { headers: { 'Content-Type': 'application/json' } });
          } catch (e) {
            // Fall through
          }
        }

        // External tool fallback
        const externalTools = {
          youtube: 'https://www.y2mate.com',
          tiktok: 'https://ssstik.io',
          twitter: 'https://twdown.net',
          instagram: 'https://snapinsta.app',
          facebook: 'https://fdown.net',
        };

        const platformNames = {
          youtube: 'YouTube',
          tiktok: 'TikTok',
          twitter: 'X (Twitter)',
          instagram: 'Instagram',
          facebook: 'Facebook',
        };

        return new Response(JSON.stringify({
          platform: platformNames[platform] || platform,
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

    // Serve HTML
    return new Response(HTML_CONTENT, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

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
  .input-group { display: flex; gap: 8px; margin-bottom: 16px; }
  input[type="url"] {
    flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0;
    border-radius: 8px; font-size: 14px; outline: none;
  }
  input[type="url"]:focus { border-color: #667eea; }
  button {
    padding: 12px 24px; background: #667eea; color: white;
    border: none; border-radius: 8px; font-size: 14px;
    font-weight: 600; cursor: pointer;
  }
  button:hover { background: #5a6fd6; }
  button:disabled { background: #ccc; cursor: not-allowed; }
  .result { margin-top: 24px; padding: 16px; border-radius: 8px; background: #f8f9fa; display: none; }
  .result.show { display: block; }
  .result img, .result video { max-width: 100%; border-radius: 8px; margin-top: 12px; }
  .download-btn {
    display: inline-block; margin-top: 12px; padding: 10px 20px;
    background: #28a745; color: white; text-decoration: none;
    border-radius: 8px; font-size: 14px;
  }
  .external-btn {
    display: inline-block; margin-top: 12px; padding: 10px 20px;
    background: #667eea; color: white; text-decoration: none;
    border-radius: 8px; font-size: 14px;
  }
  .error { color: #dc3545; margin-top: 12px; font-size: 14px; }
  .loading { text-align: center; padding: 20px; display: none; }
  .loading.show { display: block; }
  .spinner {
    border: 3px solid #f3f3f3; border-top: 3px solid #667eea;
    border-radius: 50%; width: 30px; height: 30px;
    animation: spin 1s linear infinite; margin: 0 auto 12px;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #999; }
  .footer a { color: #667eea; text-decoration: none; }
</style>
</head>
<body>
  <div class="container">
    <h1>SNS 미디어 다운로드</h1>
    <p class="subtitle">인스타그램, 틱톡, X, 페이스북, 블루스카이에서 영상과 사진을 다운로드하세요</p>

    <div class="platforms">
      <span class="platform">Instagram</span>
      <span class="platform">TikTok</span>
      <span class="platform">X (Twitter)</span>
      <span class="platform">Facebook</span>
      <span class="platform">Bluesky</span>
    </div>

    <div class="input-group">
      <input type="url" id="urlInput" placeholder="SNS 게시물 URL을 붙여넣으세요" />
      <button id="downloadBtn" onclick="handleDownload()">다운로드</button>
    </div>

    <div class="loading" id="loading">
      <div class="spinner"></div>
      <p>미디어를 추출하는 중...</p>
    </div>

    <div class="result" id="result"></div>

    <div class="footer">
      <p>공개 게시물만 지원됩니다. 저작권을 존중해 주세요.</p>
      <p><a href="https://issuedayissue.blogspot.com" target="_blank">IssueIssue 블로그</a></p>
    </div>
  </div>

  <script>
    async function handleDownload() {
      const url = document.getElementById('urlInput').value.trim();
      const resultDiv = document.getElementById('result');
      const loadingDiv = document.getElementById('loading');
      const btn = document.getElementById('downloadBtn');

      if (!url) {
        resultDiv.innerHTML = '<p class="error">URL을 입력해 주세요.</p>';
        resultDiv.classList.add('show');
        return;
      }

      btn.disabled = true;
      loadingDiv.classList.add('show');
      resultDiv.classList.remove('show');

      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.error) {
          resultDiv.innerHTML = `<p class="error">${data.error}</p>`;
        } else if (data.mediaUrl) {
          const isVideo = data.type === 'video';
          resultDiv.innerHTML = `
            <p><strong>${data.platform}</strong>에서 미디어를 찾았습니다.</p>
            ${isVideo ? `<video src="${data.mediaUrl}" controls></video>` : `<img src="${data.mediaUrl}" alt="미디어" />`}
            <br>
            <a class="download-btn" href="${data.mediaUrl}" download target="_blank">다운로드</a>
          `;
        } else if (data.externalTool) {
          resultDiv.innerHTML = `
            <p><strong>${data.platform}</strong> 미디어 다운로드</p>
            <p>${data.note || ''}</p>
            <br>
            <a class="external-btn" href="${data.externalTool}" target="_blank">외부 도구에서 다운로드</a>
          `;
        } else {
          resultDiv.innerHTML = '<p class="error">미디어를 찾을 수 없습니다.</p>';
        }
      } catch (e) {
        resultDiv.innerHTML = `<p class="error">오류가 발생했습니다: ${e.message}</p>`;
      } finally {
        loadingDiv.classList.remove('show');
        btn.disabled = false;
        resultDiv.classList.add('show');
      }
    }

    document.getElementById('urlInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleDownload();
    });
  </script>
</body>
</html>`;