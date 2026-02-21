import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   MOCK CLIP GENERATOR
========================================================= */
function generateMockClips(videoUrl, count = 5) {
  const clips = [];

  for (let i = 0; i < count; i++) {
    clips.push({
      id: crypto.randomUUID(),
      url: videoUrl,
      thumbnail: "https://placehold.co/600x400",
      title: `AI Clip ${i + 1}`,
      start_time: i * 20,
      end_time: i * 20 + 30,
      duration: 30,
      viral_score: Math.floor(Math.random() * 100),
    });
  }

  return clips;
}

/* =========================================================
   ROUTES
========================================================= */

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.get("/", (req, res) => {
  res.json({ status: "Clip Backend Running 🚀" });
});

/* =========================================================
   PROCESS (INSTANT COMPLETE — NO JOB STORAGE)
========================================================= */
app.post("/process", async (req, res) => {
  try {
    const { video_url, settings } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "Missing video_url" });
    }

    const clipCount =
      Number(req.body.clipCount) ||
      Number(req.body.number_of_clips) ||
      Number(req.body.clips) ||
      Number(settings?.clipCount) ||
      Number(settings?.number_of_clips) ||
      Number(settings?.clips) ||
      5;

    const clips = generateMockClips(video_url, clipCount);

    res.json({
      job_id: crypto.randomUUID(),
      status: "completed",
      clips,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
