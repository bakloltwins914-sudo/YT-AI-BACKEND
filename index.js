import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "Viral Detection Engine Running 🚀" });
});

app.get("/explore", async (req, res) => {
  try {
    const query = req.query.q || "gaming";

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // 🔎 STEP 1: Fetch recent US short-form uploads
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 30,
          order: "date",
          publishedAfter: sevenDaysAgo,
          relevanceLanguage: "en",
          regionCode: "US",
          videoDuration: "short"
        }
      }
    );

    const videoIds = searchResponse.data.items.map(
      (item) => item.id.videoId
    );

    if (!videoIds.length) {
      return res.json([]);
    }

    // 📊 STEP 2: Get statistics
    const statsResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: videoIds.join(","),
          part: "statistics,snippet"
        }
      }
    );

    const now = new Date();

    const processedVideos = statsResponse.data.items
      .map((video) => {
        const views = parseInt(video.statistics.viewCount || 0);
        const likes = parseInt(video.statistics.likeCount || 0);
        const comments = parseInt(video.statistics.commentCount || 0);

        const publishedAt = new Date(video.snippet.publishedAt);
        const hoursSinceUpload =
          (now - publishedAt) / (1000 * 60 * 60);

        if (hoursSinceUpload <= 0.5) return null;

        // 📈 Velocity
        const viewsPerHour = views / hoursSinceUpload;

        // 💬 Engagement
        const engagementRate =
          views > 0 ? (likes + comments) / views : 0;

        // 🚨 Quality filters
        if (views < 500) return null;
        if (engagementRate < 0.02) return null;

        // 🔥 Recency boost
        let recencyBoost = 1;
        if (hoursSinceUpload <= 6) recencyBoost = 2.2;
        else if (hoursSinceUpload <= 24) recencyBoost = 1.8;
        else if (hoursSinceUpload <= 72) recencyBoost = 1.4;
        else recencyBoost = 1.1;

        // 💎 Engagement multiplier
        const engagementBoost = 1 + engagementRate * 6;

        // ⚡ Final trend score
        const trendScore =
          viewsPerHour *
          recencyBoost *
          engagementBoost;

        // 🚀 Viral spike detection
        let viralLevel = "Normal";
        if (viewsPerHour > 20000 && engagementRate > 0.05)
          viralLevel = "Breakout";
        else if (viewsPerHour > 10000)
          viralLevel = "Hot";
        else if (viewsPerHour > 5000)
          viralLevel = "Rising";

        return {
          videoId: video.id,
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          views,
          likes,
          comments,
          hoursSinceUpload: Math.round(hoursSinceUpload),
          viewsPerHour: Math.round(viewsPerHour),
          engagementRate: Number(engagementRate.toFixed(3)),
          trendScore: Math.round(trendScore),
          viralLevel
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.trendScore - a.trendScore);

    res.json(processedVideos);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Engine failure",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
