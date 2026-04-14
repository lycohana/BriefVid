export type SupportedVideoPlatform = "bilibili" | "youtube";

export type PlayerEmbedDescriptor = {
  platform: SupportedVideoPlatform;
  embedUrl: string;
  sourceUrl: string;
  openLabel: string;
};

export function buildBilibiliEmbedUrl(sourceUrl?: string | null) {
  if (!sourceUrl) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if (!host.includes("bilibili.com") && !host.includes("b23.tv")) {
      return null;
    }

    const bvidFromPath = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i)?.[1] ?? null;
    const aidFromPath = url.pathname.match(/\/video\/av(\d+)/i)?.[1] ?? null;
    const bvid = url.searchParams.get("bvid") ?? bvidFromPath;
    const aid = url.searchParams.get("aid") ?? aidFromPath;
    const page = url.searchParams.get("p") ?? "1";

    if (!bvid && !aid) {
      return null;
    }

    const embedUrl = new URL("https://player.bilibili.com/player.html");
    embedUrl.searchParams.set("isOutside", "true");
    embedUrl.searchParams.set("autoplay", "0");
    embedUrl.searchParams.set("p", page);
    if (bvid) {
      embedUrl.searchParams.set("bvid", bvid);
    }
    if (aid) {
      embedUrl.searchParams.set("aid", aid);
    }
    return embedUrl.toString();
  } catch {
    return null;
  }
}

export function buildYouTubeEmbedUrl(sourceUrl?: string | null) {
  if (!sourceUrl) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host.endsWith("youtu.be")) {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host.includes("youtube.com")) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        videoId = url.pathname.match(/^\/shorts\/([^/?#]+)/i)?.[1] ?? null;
      }
    }

    if (!videoId) {
      return null;
    }

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    embedUrl.searchParams.set("autoplay", "0");
    embedUrl.searchParams.set("rel", "0");
    return embedUrl.toString();
  } catch {
    return null;
  }
}

export function withPlayerSeek(embedUrl: string, platform: SupportedVideoPlatform, seconds: number | null, nonce: number) {
  const url = new URL(embedUrl);
  if (seconds != null && Number.isFinite(seconds) && seconds >= 0) {
    const normalized = String(Math.floor(seconds));
    if (platform === "youtube") {
      url.searchParams.set("start", normalized);
    } else {
      url.searchParams.set("t", normalized);
    }
  } else if (platform === "youtube") {
    url.searchParams.delete("start");
  } else {
    url.searchParams.delete("t");
  }
  url.searchParams.set("_ts", String(nonce));
  return url.toString();
}

export function buildPlayerEmbedDescriptor(sourceUrl?: string | null): PlayerEmbedDescriptor | null {
  const bilibiliEmbedUrl = buildBilibiliEmbedUrl(sourceUrl);
  if (bilibiliEmbedUrl && sourceUrl) {
    return {
      platform: "bilibili",
      embedUrl: bilibiliEmbedUrl,
      sourceUrl,
      openLabel: "在 Bilibili 打开",
    };
  }

  const youtubeEmbedUrl = buildYouTubeEmbedUrl(sourceUrl);
  if (youtubeEmbedUrl && sourceUrl) {
    return {
      platform: "youtube",
      embedUrl: youtubeEmbedUrl,
      sourceUrl,
      openLabel: "在 YouTube 打开",
    };
  }

  return null;
}
