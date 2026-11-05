// Cloudflare Pages Function: SNS 미디어 다운로드 API
// POST /api/download { url: "https://..." }

export async function onRequestPost(context) {
  const { request } = context;

  try {
    const body = await request.json();
    const url = body.url?.trim();

    if (!url) {
      return jsonResponse({ error: 'URL을 입력해 주세요.' }, 400);
    }

    const platform = detectPlatform(url);

    if (!platform) {
      return jsonResponse({ error: '지원하지 않는 URL입니다. 인스타그램, 틱톡, X, 페이스북, 블루스카이, 유튜브 URL을 입력해 주세요.' }, 400);
    }

    // Platform-specific handling
    switch (platform) {
      case 'youtube':
        return await handleYouTube(url);
      case 'tiktok':
        return await handleTikTok(url);
      case 'twitter':
        return await handleTwitter(url);
      case 'instagram':
        return await handleInstagram(url);
      case 'bluesky':
        return await handleBluesky(url);
      case 'facebook':
        return await handleFacebook(url);
      default:
        return jsonResponse({ error: '지원하지 않는 플랫폼입니다.' }, 400);
    }
  } catch (e) {
    return jsonResponse({ error: `오류가 발생했습니다: ${e.message}` }, 500);
  }
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('bsky.app') || url.includes('bluesky')) return 'bluesky';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// YouTube: oEmbed API로 썸네일 + 직접 다운로드 링크
async function handleYouTube(url) {
  try {
    // Extract video ID
    let videoId = null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) videoId = ytMatch[1];

    if (!videoId) {
      return jsonResponse({ error: 'YouTube 영상 ID를 찾을 수 없습니다.' }, 400);
    }

    // Get oEmbed info
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    const oembed = await oembedRes.json();

    // YouTube doesn't provide direct download URLs via public API
    // Return the embed URL and thumbnail
    return jsonResponse({
      platform: 'YouTube',
      title: oembed.title,
      author: oembed.author_name,
      thumbnail: oembed.thumbnail_url,
      mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
      type: 'video',
      note: 'YouTube는 직접 다운로드를 지원하지 않습니다. YouTube Premium 또는 yt-dlp를 사용하세요.',
    });
  } catch (e) {
    return jsonResponse({ error: `YouTube 처리 오류: ${e.message}` }, 500);
  }
}

// TikTok: API 엔드포인트 분석
async function handleTikTok(url) {
  try {
    // TikTok oEmbed
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);
    const oembed = await oembedRes.json();

    return jsonResponse({
      platform: 'TikTok',
      title: oembed.title,
      author: oembed.author_name,
      thumbnail: oembed.thumbnail_url,
      mediaUrl: oembed.thumbnail_url, // Placeholder - actual video URL requires scraping
      type: 'video',
      note: 'TikTok 영상 다운로드는 서버 사이드 구현이 필요합니다. 현재는 썸네일만 제공됩니다.',
    });
  } catch (e) {
    return jsonResponse({ error: `TikTok 처리 오류: ${e.message}` }, 500);
  }
}

// Twitter/X: oEmbed
async function handleTwitter(url) {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const oembedRes = await fetch(oembedUrl);
    const oembed = await oembedRes.json();

    return jsonResponse({
      platform: 'X (Twitter)',
      title: oembed.author_name,
      author: oembed.author_name,
      thumbnail: null,
      mediaUrl: null,
      type: 'unknown',
      note: 'X(Twitter) 미디어 다운로드는 API 인증이 필요합니다. 현재는 기본 정보만 제공됩니다.',
    });
  } catch (e) {
    return jsonResponse({ error: `X 처리 오류: ${e.message}` }, 500);
  }
}

// Instagram: 제한적 (스크래핑 필요)
async function handleInstagram(url) {
  return jsonResponse({
    platform: 'Instagram',
    title: 'Instagram 미디어',
    author: null,
    thumbnail: null,
    mediaUrl: null,
    type: 'unknown',
    note: 'Instagram은 스크래핑이 필요하여 현재 지원되지 않습니다. 공식 앱에서 저장 기능을 사용하세요.',
  });
}

// Bluesky: 공개 API
async function handleBluesky(url) {
  try {
    // Extract post ID from URL
    const match = url.match(/bsky\.app\/profile\/([^/]+)\/post\/([^/?]+)/);
    if (!match) {
      return jsonResponse({ error: 'Bluesky 게시물 URL을 파싱할 수 없습니다.' }, 400);
    }

    const handle = match[1];
    const postId = match[2];

    // Get DID from handle
    const resolveRes = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
    const resolve = await resolveRes.json();
    const did = resolve.did;

    // Get post
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

    return jsonResponse({
      platform: 'Bluesky',
      title: post.thread?.post?.record?.text || 'Bluesky 게시물',
      author: post.thread?.post?.author?.displayName || handle,
      thumbnail: embed?.images?.[0]?.thumb || null,
      mediaUrl,
      type,
    });
  } catch (e) {
    return jsonResponse({ error: `Bluesky 처리 오류: ${e.message}` }, 500);
  }
}

// Facebook: 제한적
async function handleFacebook(url) {
  return jsonResponse({
    platform: 'Facebook',
    title: 'Facebook 미디어',
    author: null,
    thumbnail: null,
    mediaUrl: null,
    type: 'unknown',
    note: 'Facebook은 Graph API 인증이 필요하여 현재 지원되지 않습니다.',
  });
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}