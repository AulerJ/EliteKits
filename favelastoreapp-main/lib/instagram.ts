export type InstagramPost = {
  id: string;
  caption: string | null;
  mediaType: string;
  mediaUrl: string | null;
  permalink: string;
  timestamp: string | null;
};

export type InstagramFeed = {
  configured: boolean;
  username: string;
  profilePictureUrl: string | null;
  posts: InstagramPost[];
  error: string | null;
};

type InstagramMediaApiItem = {
  id?: string;
  caption?: string | null;
  media_type?: string;
  media_url?: string | null;
  permalink?: string;
  thumbnail_url?: string | null;
  timestamp?: string | null;
  children?: {
    data?: Array<{
      media_type?: string;
      media_url?: string | null;
      thumbnail_url?: string | null;
    }>;
  };
};

type InstagramUserApiResponse = {
  username?: string;
  profile_picture_url?: string | null;
};

function pickBestMediaUrl(item: InstagramMediaApiItem): string | null {
  if (item.media_type === "VIDEO") {
    return item.thumbnail_url ?? item.media_url ?? null;
  }

  if (item.media_type === "CAROUSEL_ALBUM") {
    const child = item.children?.data?.[0];
    if (!child) return item.media_url ?? item.thumbnail_url ?? null;
    if (child.media_type === "VIDEO") {
      return child.thumbnail_url ?? child.media_url ?? null;
    }
    return child.media_url ?? child.thumbnail_url ?? item.media_url ?? null;
  }

  return item.media_url ?? item.thumbnail_url ?? null;
}

export async function getInstagramFeed(limit = 6): Promise<InstagramFeed> {
  const accessToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_IG_USER_ID;
  const apiVersion = process.env.INSTAGRAM_GRAPH_API_VERSION || "v23.0";
  const fallbackUsername =
    process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME || "favela_store_usa";

  if (!accessToken || !userId) {
    return {
      configured: false,
      username: fallbackUsername,
      profilePictureUrl: null,
      posts: [],
      error: null,
    };
  }

  try {
    const mediaUrl = new URL(
      `https://graph.facebook.com/${apiVersion}/${userId}/media`
    );
    mediaUrl.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_type,media_url,thumbnail_url}"
    );
    mediaUrl.searchParams.set("limit", String(limit));
    mediaUrl.searchParams.set("access_token", accessToken);

    const userUrl = new URL(
      `https://graph.facebook.com/${apiVersion}/${userId}`
    );
    userUrl.searchParams.set("fields", "username,profile_picture_url");
    userUrl.searchParams.set("access_token", accessToken);

    const [mediaResponse, userResponse] = await Promise.all([
      fetch(mediaUrl.toString(), { cache: "no-store" }),
      fetch(userUrl.toString(), { cache: "no-store" }),
    ]);

    if (!mediaResponse.ok) {
      const body = await mediaResponse.text();
      return {
        configured: true,
        username: fallbackUsername,
        profilePictureUrl: null,
        posts: [],
        error: body || "Erro ao buscar posts do Instagram.",
      };
    }

    const mediaJson = (await mediaResponse.json()) as {
      data?: InstagramMediaApiItem[];
    };

    const userJson = userResponse.ok
      ? ((await userResponse.json()) as InstagramUserApiResponse)
      : null;

    const posts = (mediaJson.data ?? [])
      .map<InstagramPost | null>((item) => {
        const mediaUrlValue = pickBestMediaUrl(item);
        const permalink = item.permalink?.trim();
        const id = item.id?.trim();

        if (!mediaUrlValue || !permalink || !id) return null;

        return {
          id,
          caption: item.caption?.trim() || null,
          mediaType: item.media_type || "IMAGE",
          mediaUrl: mediaUrlValue,
          permalink,
          timestamp: item.timestamp || null,
        } satisfies InstagramPost;
      })
      .filter((item): item is InstagramPost => item !== null);

    return {
      configured: true,
      username: userJson?.username?.trim() || fallbackUsername,
      profilePictureUrl: userJson?.profile_picture_url?.trim() || null,
      posts,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      username: fallbackUsername,
      profilePictureUrl: null,
      posts: [],
      error: error instanceof Error ? error.message : "Erro inesperado.",
    };
  }
}
