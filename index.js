import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/explore", async (req, res) => {
  try {
    const query = req.query.q || "mrbeast";

    // STEP 1 — Search videos
    const searchResponse = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: query,
          part: "snippet",
          type: "video",
          maxResults: 15,
          order: "date",
          relevanceLanguage: "en",
          regionCode: "US",
          videoDuration: "short"
        }
      }
    );

    const videoIds = searchResponse.data.items.map(
      (item) => item.id.videoId
    );

    // STEP 2 — Get stats
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

    const processedVideos = statsResponse.data.items.map((video) => {
      const views = parseInt(video.statistics.viewCount || 0);
      const likes = parseInt(video.statistics.likeCount || 0);
      const comments = parseInt(video.statistics.commentCount || 0);

      const publishedDate = new Date(video.snippet.publishedAt);
      const daysSinceUpload =
        (now - publishedDate) / (1000 * 60 * 60 * 24);

      const viewsPerDay =
        daysSinceUpload > 0 ? views / daysSinceUpload : views;

      const engagementRate =
        views > 0 ? (likes + comments) / views : 0;

      // Recency boost (stronger boost if under 7 days old)
      let recencyBoost = 1;
      if (daysSinceUpload <= 1) recencyBoost = 3;
      else if (daysSinceUpload <= 3) recencyBoost = 2;
      else if (daysSinceUpload <= 7) recencyBoost = 1.5;
      else if (daysSinceUpload <= 30) recencyBoost = 1.2;

      // Final intelligent trend score
      const trendScore =
        viewsPerDay *
        (1 + engagementRate * 5) *
        recencyBoost;

      return {
        videoId: video.id,
        title: video.snippet.title,
        channel: video.snippet.channelTitle,
        publishedAt: video.snippet.publishedAt,
        views,
        likes,
        comments,
        viewsPerDay: Math.round(viewsPerDay),
        engagementRate: Number(engagementRate.toFixed(4)),
        trendScore: Math.round(trendScore)
      };
    });

    // Sort by smartest trendScore
    processedVideos.sort((a, b) => b.trendScore - a.trendScore);

    res.json(processedVideos);

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
