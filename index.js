import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({ message: "YouTube Trend Engine Running 🚀" });
});

app.get("/explore", async (req, res) => {
  try {
    const query = req.query.q || "mrbeast";

    // STEP 1: Search videos
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 25,
          order: "viewCount",
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

    // STEP 2: Get statistics
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

    const processedVideos = statsResponse.data.items
      .map((video) => {
        const views = parseInt(video.statistics.viewCount || 0);
        const likes = parseInt(video.statistics.likeCount || 0);
        const comments = parseInt(video.statistics.commentCount || 0);
        const publishedAt = new Date(video.snippet.publishedAt);

        const now = new Date();
        const daysSinceUpload =
          (now - publishedAt) / (1000 * 60 * 60 * 24);

        // 🔒 QUALITY FILTERS
        const minViews = 1000;
        const minEngagement = 0.01;

        if (views < minViews) return null;

        const engagementRate =
          views > 0 ? (likes + comments) / views : 0;

        if (engagementRate < minEngagement) return null;

        // 🧠 Prevent crazy early inflation
        const adjustedDays = Math.max(daysSinceUpload, 0.5);
        const viewsPerDay = views / adjustedDays;

        // 🚀 Recency boost
        let recencyBoost = 1;
        if (daysSinceUpload <= 1) recencyBoost = 2;
        else if (daysSinceUpload <= 3) recencyBoost = 1.7;
        else if (daysSinceUpload <= 7) recencyBoost = 1.4;
        else if (daysSinceUpload <= 30) recencyBoost = 1.1;

        // ⭐ Big channel boost
        const channelBoost = views > 1000000 ? 1.3 : 1;

        const trendScore =
          viewsPerDay *
          (1 + engagementRate * 4) *
          recencyBoost *
          channelBoost;

        return {
          videoId: video.id,
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt,
          views,
          likes,
          comments,
          viewsPerDay: Math.round(viewsPerDay),
          engagementRate: Number(engagementRate.toFixed(3)),
          trendScore: Math.round(trendScore)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.trendScore - a.trendScore);

    res.json(processedVideos);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      error: "Something went wrong",
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
