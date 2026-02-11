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

    res.json(searchResponse.data.items);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
