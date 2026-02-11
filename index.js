import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Sample: Replace this with your live fetch from DB or YouTube API
let videos = [
  // Example entry
  {
    videoId: "IQxea9UB1nQ",
    title: "$100,000,000 Car Doors",
    channel: "MrBeast",
    publishedAt: "2023-09-19T17:00:00Z",
    views: 1285069443,
    likes: 29804024,
    comments: 41419,
  },
  // Add all your video objects here
];

// UTILITY FUNCTIONS
const calculateMetrics = (video) => {
  const published = new Date(video.publishedAt);
  const now = new Date();
  const hoursSinceUpload = Math.max((now - published) / 36e5, 1); // prevent div by 0
  const viewsPerHour = video.views / hoursSinceUpload;
  const viewsPerDay = viewsPerHour * 24;
  const engagementRate = ((video.likes + video.comments) / video.views).toFixed(4);
  const viralScore = (viewsPerDay * engagementRate * 10).toFixed(0); // arbitrary boost
  return {
    ...video,
    hoursSinceUpload,
    viewsPerHour,
    viewsPerDay,
    engagementRate: parseFloat(engagementRate),
    viralScore: parseInt(viralScore),
  };
};

// ENHANCE ALL VIDEOS
const enhancedData = () => videos.map(calculateMetrics);

// SORTING HELPERS
const sortByMetric = (data, metric = "viralScore", order = "desc") =>
  data.sort((a, b) => (order === "desc" ? b[metric] - a[metric] : a[metric] - b[metric]));

// API ENDPOINTS
app.get("/", (req, res) => {
  res.send("🔥 Beast backend running!");
});

// Get all videos with metrics
app.get("/videos", (req, res) => {
  const data = enhancedData();
  res.json(data);
});

// Sort videos dynamically by query params
// Example: /videos/sort?metric=viewsPerDay&order=desc
app.get("/videos/sort", (req, res) => {
  const { metric = "viralScore", order = "desc" } = req.query;
  const data = sortByMetric(enhancedData(), metric, order);
  res.json(data);
});

// Filter videos by min views or engagement rate
// Example: /videos/filter?minViews=1000000&minEngagement=0.02
app.get("/videos/filter", (req, res) => {
  const { minViews = 0, minEngagement = 0 } = req.query;
  const data = enhancedData().filter(
    (v) => v.views >= minViews && v.engagementRate >= minEngagement
  );
  res.json(data);
});

// Add new video dynamically
app.post("/videos", (req, res) => {
  const newVideo = req.body;
  if (!newVideo.videoId || !newVideo.views) {
    return res.status(400).json({ error: "videoId and views are required" });
  }
  videos.push(newVideo);
  res.json({ success: true, video: calculateMetrics(newVideo) });
});

// Server start
app.listen(PORT, () => {
  console.log(`🔥 Beast backend live on port ${PORT}`);
});
