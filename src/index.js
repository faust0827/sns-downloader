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
    const binary = atob(HTML_B64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const html = new TextDecoder('utf-8').decode(bytes);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};

const HTML_B64 = "PCFET0NUWVBFIGh0bWw+CjxodG1sIGxhbmc9ImtvIj4KPGhlYWQ+CjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjAiPgo8dGl0bGU+U05TIOuvuOuUlOyWtCDri6TsmrTroZzrk5wg64+E6rWsIOKAlCDsnbjsiqTtg4DCt+2Lse2GocK3WMK37Y6Y7J207Iqk67aBwrfruJTro6jsiqTsubTsnbQ8L3RpdGxlPgo8bWV0YSBuYW1lPSJkZXNjcmlwdGlvbiIgY29udGVudD0i7J247Iqk7YOA6re4656oLCDti7HthqEsIFgo7Yq47JyE7YSwKSwg7Y6Y7J207Iqk67aBLCDruJTro6jsiqTsubTsnbTsl5DshJwg7JiB7IOB6rO8IOyCrOynhOydhCDri6TsmrTroZzrk5ztlZjripQg67Cp67KV7J2EIOyViOuCtO2VqeuLiOuLpC4iPgo8c3R5bGU+CiAgKiB7IG1hcmdpbjogMDsgcGFkZGluZzogMDsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfQogIGJvZHkgewogICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCBzYW5zLXNlcmlmOwogICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDEzNWRlZywgIzY2N2VlYSAwJSwgIzc2NGJhMiAxMDAlKTsKICAgIG1pbi1oZWlnaHQ6IDEwMHZoOwogICAgZGlzcGxheTogZmxleDsKICAgIGFsaWduLWl0ZW1zOiBjZW50ZXI7CiAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjsKICAgIHBhZGRpbmc6IDIwcHg7CiAgfQogIC5jb250YWluZXIgewogICAgYmFja2dyb3VuZDogd2hpdGU7CiAgICBib3JkZXItcmFkaXVzOiAxNnB4OwogICAgcGFkZGluZzogNDBweDsKICAgIG1heC13aWR0aDogNjAwcHg7CiAgICB3aWR0aDogMTAwJTsKICAgIGJveC1zaGFkb3c6IDAgMjBweCA2MHB4IHJnYmEoMCwwLDAsMC4zKTsKICB9CiAgaDEgeyBmb250LXNpemU6IDI0cHg7IG1hcmdpbi1ib3R0b206IDhweDsgY29sb3I6ICMzMzM7IH0KICAuc3VidGl0bGUgeyBjb2xvcjogIzY2NjsgbWFyZ2luLWJvdHRvbTogMjRweDsgZm9udC1zaXplOiAxNHB4OyB9CiAgLnBsYXRmb3JtcyB7IGRpc3BsYXk6IGZsZXg7IGdhcDogOHB4OyBmbGV4LXdyYXA6IHdyYXA7IG1hcmdpbi1ib3R0b206IDI0cHg7IH0KICAucGxhdGZvcm0geyBwYWRkaW5nOiA2cHggMTJweDsgYm9yZGVyLXJhZGl1czogMjBweDsgZm9udC1zaXplOiAxMnB4OyBiYWNrZ3JvdW5kOiAjZjBmMGYwOyBjb2xvcjogIzU1NTsgfQogIC50b29sLWxpc3QgeyBtYXJnaW46IDIwcHggMDsgfQogIC50b29sLWl0ZW0gewogICAgYmFja2dyb3VuZDogI2Y4ZjlmYTsKICAgIGJvcmRlci1yYWRpdXM6IDhweDsKICAgIHBhZGRpbmc6IDE2cHg7CiAgICBtYXJnaW4tYm90dG9tOiAxMnB4OwogIH0KICAudG9vbC1pdGVtIGgzIHsgZm9udC1zaXplOiAxNnB4OyBtYXJnaW4tYm90dG9tOiA4cHg7IGNvbG9yOiAjMzMzOyB9CiAgLnRvb2wtaXRlbSBwIHsgZm9udC1zaXplOiAxM3B4OyBjb2xvcjogIzY2NjsgbWFyZ2luLWJvdHRvbTogOHB4OyB9CiAgLnRvb2wtbGluayB7CiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7CiAgICBwYWRkaW5nOiA4cHggMTZweDsKICAgIGJhY2tncm91bmQ6ICM2NjdlZWE7CiAgICBjb2xvcjogd2hpdGU7CiAgICB0ZXh0LWRlY29yYXRpb246IG5vbmU7CiAgICBib3JkZXItcmFkaXVzOiA2cHg7CiAgICBmb250LXNpemU6IDEzcHg7CiAgfQogIC50b29sLWxpbms6aG92ZXIgeyBiYWNrZ3JvdW5kOiAjNWE2ZmQ2OyB9CiAgLmZvb3RlciB7CiAgICBtYXJnaW4tdG9wOiAyNHB4OwogICAgdGV4dC1hbGlnbjogY2VudGVyOwogICAgZm9udC1zaXplOiAxMnB4OwogICAgY29sb3I6ICM5OTk7CiAgfQogIC5mb290ZXIgYSB7IGNvbG9yOiAjNjY3ZWVhOyB0ZXh0LWRlY29yYXRpb246IG5vbmU7IH0KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KICA8ZGl2IGNsYXNzPSJjb250YWluZXIiPgogICAgPGgxPlNOUyDrr7jrlJTslrQg64uk7Jq066Gc65OcPC9oMT4KICAgIDxwIGNsYXNzPSJzdWJ0aXRsZSI+7J247Iqk7YOA6re4656oLCDti7HthqEsIFgsIO2OmOydtOyKpOu2gSwg67iU66Oo7Iqk7Lm07J207JeQ7IScIOyYgeyDgeqzvCDsgqzsp4TsnYQg64uk7Jq066Gc65Oc7ZWY64qUIOuwqeuyleydhCDslYjrgrTtlanri4jri6Q8L3A+CgogICAgPGRpdiBjbGFzcz0icGxhdGZvcm1zIj4KICAgICAgPHNwYW4gY2xhc3M9InBsYXRmb3JtIj5JbnN0YWdyYW08L3NwYW4+CiAgICAgIDxzcGFuIGNsYXNzPSJwbGF0Zm9ybSI+VGlrVG9rPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0icGxhdGZvcm0iPlggKFR3aXR0ZXIpPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0icGxhdGZvcm0iPkZhY2Vib29rPC9zcGFuPgogICAgICA8c3BhbiBjbGFzcz0icGxhdGZvcm0iPkJsdWVza3k8L3NwYW4+CiAgICA8L2Rpdj4KCiAgICA8ZGl2IGNsYXNzPSJ0b29sLWxpc3QiPgogICAgICA8ZGl2IGNsYXNzPSJ0b29sLWl0ZW0iPgogICAgICAgIDxoMz7wn5O4IOyduOyKpO2DgOq3uOueqDwvaDM+CiAgICAgICAgPHA+6rKM7Iuc66y8LCDrprTsiqQsIOyKpO2GoOumrCDri6TsmrTroZzrk5w8L3A+CiAgICAgICAgPGEgY2xhc3M9InRvb2wtbGluayIgaHJlZj0iaHR0cHM6Ly9zbmFwaW5zdGEuYXBwIiB0YXJnZXQ9Il9ibGFuayI+c25hcGluc3RhLmFwcDwvYT4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InRvb2wtaXRlbSI+CiAgICAgICAgPGgzPvCfjrUg7Yux7YahPC9oMz4KICAgICAgICA8cD7sm4zthLDrp4jtgawg7JeG64qUIOyYgeyDgSDri6TsmrTroZzrk5w8L3A+CiAgICAgICAgPGEgY2xhc3M9InRvb2wtbGluayIgaHJlZj0iaHR0cHM6Ly9zc3N0aWsuaW8iIHRhcmdldD0iX2JsYW5rIj5zc3N0aWsuaW88L2E+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJ0b29sLWl0ZW0iPgogICAgICAgIDxoMz7wn5CmIFggKO2KuOychO2EsCk8L2gzPgogICAgICAgIDxwPuyYgeyDgSwgR0lGLCDsnbTrr7jsp4Ag64uk7Jq066Gc65OcPC9wPgogICAgICAgIDxhIGNsYXNzPSJ0b29sLWxpbmsiIGhyZWY9Imh0dHBzOi8vdHdkb3duLm5ldCIgdGFyZ2V0PSJfYmxhbmsiPnR3ZG93bi5uZXQ8L2E+CiAgICAgIDwvZGl2PgogICAgICA8ZGl2IGNsYXNzPSJ0b29sLWl0ZW0iPgogICAgICAgIDxoMz7wn5OYIO2OmOydtOyKpOu2gTwvaDM+CiAgICAgICAgPHA+7JiB7IOBIOuLpOyatOuhnOuTnDwvcD4KICAgICAgICA8YSBjbGFzcz0idG9vbC1saW5rIiBocmVmPSJodHRwczovL2Zkb3duLm5ldCIgdGFyZ2V0PSJfYmxhbmsiPmZkb3duLm5ldDwvYT4KICAgICAgPC9kaXY+CiAgICAgIDxkaXYgY2xhc3M9InRvb2wtaXRlbSI+CiAgICAgICAgPGgzPvCfposg67iU66Oo7Iqk7Lm07J20PC9oMz4KICAgICAgICA8cD7snbTrr7jsp4AsIOyYgeyDgSDri6TsmrTroZzrk5w8L3A+CiAgICAgICAgPGEgY2xhc3M9InRvb2wtbGluayIgaHJlZj0iaHR0cHM6Ly9ic2t5LmFwcCIgdGFyZ2V0PSJfYmxhbmsiPmJza3kuYXBwPC9hPgogICAgICA8L2Rpdj4KICAgIDwvZGl2PgoKICAgIDxkaXYgY2xhc3M9ImZvb3RlciI+CiAgICAgIDxwPuqzteqwnCDqsozsi5zrrLzrp4wg7KeA7JuQ65Cp64uI64ukLiDsoIDsnpHqtozsnYQg7KG07KSR7ZW0IOyjvOyEuOyalC48L3A+CiAgICAgIDxwPjxhIGhyZWY9Imh0dHBzOi8vaXNzdWVkYXlpc3N1ZS5ibG9nc3BvdC5jb20iIHRhcmdldD0iX2JsYW5rIj5Jc3N1ZUlzc3VlIOu4lOuhnOq3uDwvYT48L3A+CiAgICA8L2Rpdj4KICA8L2Rpdj4KPC9ib2R5Pgo8L2h0bWw+Cg==";
