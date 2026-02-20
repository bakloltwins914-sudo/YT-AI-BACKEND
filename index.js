import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   FAKE JOB STORAGE (IN MEMORY)
========================================================= */
const jobs = {};

/* =========================================================
   MOCK CLIP GENERATOR (Simulates AI)
========================================================= */
function generateMockClips(videoUrl, count = 5) {
  const clips = [];

  for (let i = 0; i < count; i++) {
    clips.push({
      id: crypto.randomUUID(),
      url: videoUrl, // using original video for now
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
   PROCESS ROUTE
========================================================= */
app.post("/process", async (req, res) => {
  try {
    const { video_url, settings } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "Missing video_url" });
    }

    const jobId = crypto.randomUUID();

    // Create job as processing
    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      clips: [],
    };

    // Simulate async processing
    setTimeout(() => {
      const clips = generateMockClips(
        video_url,
        settings?.clipCount || 5
      );

      jobs[jobId] = {
        job_id: jobId,
        status: "completed",
        clips,
      };
    }, 3000); // 3 sec fake processing

    res.json({
      job_id: jobId,
      status: "processing",
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   STATUS ROUTE
========================================================= */
app.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;

  const job = jobs[jobId];

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
});

/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
