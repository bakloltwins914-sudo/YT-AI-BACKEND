import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YT_API_KEY;

if (!YT_API_KEY) {
  console.error("Error: YT_API_KEY not set!");
  process.exit(1);
}

// ==========================
// CACHE SYSTEM
// ==========================
let cache = {};
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

function setCache(key, data) {
  cache[key] = {
    timestamp: Date.now(),
    data,
  };
}

function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TIME) {
    delete cache[key];
    return null;
  }

  return entry.data;
}

// ==========================
// VIRAL SCORE CALCULATION
// ==========================
function calculateAdvancedScore(video) {
  const { views, likes, comments, subscribers, hoursSinceUpload } = video;

  const viewsPerHour = hoursSinceUpload > 0 ? views / hoursSinceUpload : views;
  const engagementRate = views > 0 ? (likes + comments) / views : 0;
  const subRatio = subscribers > 0 ? views / subscribers : 0;

  const velocityBoost =
    hoursSinceUpload < 24 ? 1.5 : hoursSinceUpload < 72 ? 1.2 : 1;
  const ageDecay = hoursSinceUpload > 168 ? 0.7 : 1;

  const score =
    (viewsPerHour * 0.5 + engagementRate * 60000 + subRatio * 2000) *
    velocityBoost *
    ageDecay;

  let viralLevel = "Normal";
  if (score > 300000) viralLevel = "Exploding";
  else if (score > 150000) viralLevel = "Hot";
  else if (score > 70000) viralLevel = "Trending";

  return {
    viewsPerHour: Math.round(viewsPerHour),
    engagementRate: Number(engagementRate.toFixed(3)),
    subRatio: Number(subRatio.toFixed(2)),
    trendScore: Math.round(score),
    viralLevel,
  };
}

// ==========================
// MAIN DATA ROUTE
// ==========================
app.get("/data", async (req, res) => {
  try {
    const {
      q = "MrBeast",
      region = "US",
      max = 25,
      minSubs = 10000,
      minViews = 10000,
      page = 1,
    } = req.query;

    const cacheKey = `${q}-${region}-${max}-${minSubs}-${minViews}-${page}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    // ======================
    // SEARCH VIDEOS
    // ======================
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        q
      )}&type=video&order=date&maxResults=${max}&regionCode=${region}&key=${YT_API_KEY}`
    );

    const searchData = await searchRes.json();
    if (!searchData.items || searchData.items.length === 0) return res.json([]);

    const videoIds = searchData.items.map((i) => i.id.videoId).filter(Boolean);

    // ======================
    // VIDEO DETAILS
    // ======================
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds.join(
        ","
      )}&key=${YT_API_KEY}`
    );
    const videoData = await videoRes.json();

    const channelIds = videoData.items.map((v) => v.snippet.channelId);

    // ======================
    // CHANNEL DETAILS
    // ======================
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${[
        ...new Set(channelIds),
      ].join(",")}&key=${YT_API_KEY}`
    );
    const channelData = await channelRes.json();

    const channelMap = {};
    channelData.items.forEach((ch) => {
      channelMap[ch.id] = Number(ch.statistics.subscriberCount || 0);
    });

    // ======================
    // BUILD FINAL DATA
    // ======================
    const results = videoData.items.map((video) => {
      const stats = video.statistics || {};
      const snippet = video.snippet || {};

      const views = Number(stats.viewCount || 0);
      const likes = Number(stats.likeCount || 0);
      const comments = Number(stats.commentCount || 0);
      const subs = channelMap[snippet.channelId] || 0;

      const uploadTime = new Date(snippet.publishedAt);
      const now = new Date();
      const hoursSinceUpload = (now - uploadTime) / (1000 * 60 * 60);

      const base = {
        videoId: video.id,
        title: snippet.title,
        channel: snippet.channelTitle,
        thumbnail: snippet.thumbnails?.high?.url || "",
        publishedAt: snippet.publishedAt,
        views,
        likes,
        comments,
        subscribers: subs,
        hoursSinceUpload: Math.round(hoursSinceUpload),
        duration: video.contentDetails?.duration || "",
      };

      return { ...base, ...calculateAdvancedScore(base) };
    });

    // ======================
    // FILTER & SORT
    // ======================
    const filtered = results
      .filter((v) => v.subscribers >= minSubs)
      .filter((v) => v.views >= minViews)
      .sort((a, b) => b.trendScore - a.trendScore);

    // ======================
    // PAGINATION
    // ======================
    const pageSize = 10;
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    setCache(cacheKey, paginated);

    res.json(paginated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ==========================
// ANALYTICS ROUTE
// ==========================
app.get("/stats", (req, res) => {
  res.json({
    cachedQueries: Object.keys(cache).length,
    serverTime: new Date(),
    uptimeSeconds: process.uptime(),
  });
});

// ==========================
// HEALTH CHECK
// ==========================
app.get("/", (req, res) => {
  res.json({
    status: "Trend Intelligence API Running 🚀",
    version: "2.0 Beast Mode",
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
