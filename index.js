 import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

app.get("/explore", async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter q is required" });
  }

  try {
    // Search recent videos
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 10,
          order: "date"
        }
      }
    );

    const videos = searchResponse.data.items;
    const videoIds = videos.map(v => v.id.videoId).join(",");

    // Get statistics
    const statsResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: videoIds,
          part: "statistics"
        }
      }
    );

    const stats = statsResponse.data.items;

    const enrichedVideos = videos.map(video => {
      const stat = stats.find(s => s.id === video.id.videoId);

      const views = parseInt(stat?.statistics?.viewCount || 0);
      const publishedAt = new Date(video.snippet.publishedAt);
      const hoursSinceUpload =
        (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);

      const viralScore = views / (hoursSinceUpload || 1);

      return {
        videoId: video.id.videoId,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        views,
        viralScore: Math.round(viralScore)
      };
    });

    enrichedVideos.sort((a, b) => b.viralScore - a.viralScore);

    res.json(enrichedVideos);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
