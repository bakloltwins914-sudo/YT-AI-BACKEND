import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("YouTube Shorts API is running 🚀");
});

app.get("/explore", async (req, res) => {
  try {
    const query = req.query.q || "mrbeast";

    // 1️⃣ Search videos
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 15,
          order: "viewCount",
          videoDuration: "short",
          regionCode: "US",
          relevanceLanguage: "en"
        }
      }
    );

    const videos = searchResponse.data.items;

    const videoIds = videos.map((video) => video.id.videoId).join(",");

    // 2️⃣ Get statistics
    const statsResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: videoIds,
          part: "statistics,snippet"
        }
      }
    );

    const results = statsResponse.data.items.map((video) => {
      const views = parseInt(video.statistics.viewCount || 0);
      const likes = parseInt(video.statistics.likeCount || 0);
      const comments = parseInt(video.statistics.commentCount || 0);

      const publishedAt = new Date(video.snippet.publishedAt);
      const now = new Date();
      const daysSinceUpload = Math.max(
        1,
        Math.floor((now - publishedAt) / (1000 * 60 * 60 * 24))
      );

      const viralScore = views > 0 ? ((likes + comments) / views) * 100 : 0;
      const viewsPerDay = views / daysSinceUpload;

      return {
        videoId: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        views,
        likes,
        comments,
        viralScore: Number(viralScore.toFixed(2)),
        viewsPerDay: Math.floor(viewsPerDay)
      };
    });

    // 3️⃣ Sort by velocity (most important for trends)
    results.sort((a, b) => b.viewsPerDay - a.viewsPerDay);

    res.json(results);

  } catch (error) {
    console.error("Error fetching videos:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
