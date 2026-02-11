import dotenv from "dotenv";
import express from "express";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/explore", async (req, res) => {
  try {
    const query = req.query.q || "mrbeast";

    // 1️⃣ Search YouTube
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 10,
          order: "viewCount",
          relevanceLanguage: "en",
          regionCode: "US",
          videoDuration: "short"
        }
      }
    );

    const videoIds = searchResponse.data.items.map(
      item => item.id.videoId
    );

    if (!videoIds.length) {
      return res.json([]);
    }

    // 2️⃣ Get statistics
    const statsResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: videoIds.join(","),
          part: "statistics,contentDetails"
        }
      }
    );

    const enrichedVideos = statsResponse.data.items.map(video => {
      const views = Number(video.statistics.viewCount || 0);
      const likes = Number(video.statistics.likeCount || 0);
      const comments = Number(video.statistics.commentCount || 0);

      // Simple viral score formula
      const engagementRate = (likes + comments) / (views || 1);
      const viralScore = engagementRate * 100;

      return {
        videoId: video.id,
        title: searchResponse.data.items.find(
          item => item.id.videoId === video.id
        )?.snippet.title,
        channel: searchResponse.data.items.find(
          item => item.id.videoId === video.id
        )?.snippet.channelTitle,
        publishedAt: searchResponse.data.items.find(
          item => item.id.videoId === video.id
        )?.snippet.publishedAt,
        views,
        likes,
        comments,
        viralScore: Number(viralScore.toFixed(2))
      };
    });

    res.json(enrichedVideos);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
