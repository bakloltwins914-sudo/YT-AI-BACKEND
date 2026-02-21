import express from "express";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   IN-MEMORY STORAGE
========================================================= */

const jobs = {};

/* =========================================================
   HELPERS
========================================================= */

function extractVideoId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1);
    }

    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

/* =========================================================
   ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({ status: "AI Timestamp Backend Running 🚀" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* =========================================================
   PROCESS ROUTE (TIMESTAMP VERSION)
========================================================= */

app.post("/process", async (req, res) => {
  try {
    const { video_url, settings } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "Missing video_url" });
    }

    const videoId = extractVideoId(video_url);

    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const clipCount = Number(settings?.clipCount) || 3;
    const duration = 30; // 30 sec moments

    const jobId = crypto.randomUUID();

    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      clips: [],
    };

    res.json({ job_id: jobId, status: "processing" });

    // 🔥 Background fake AI scoring (replace later with real AI)
    setTimeout(() => {
      const clips = [];

      for (let i = 0; i < clipCount; i++) {
        const start = i * 60; // Example spacing
        const end = start + duration;

        clips.push({
          id: crypto.randomUUID(),
          title: `AI Moment ${i + 1}`,
          start_time: start,
          end_time: end,
          duration,
          url: `https://www.youtube.com/watch?v=${videoId}&t=${start}s`
        });
      }

      jobs[jobId] = {
        job_id: jobId,
        status: "completed",
        clips,
      };

    }, 2000); // simulate processing time

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   STATUS ROUTE
========================================================= */

app.get("/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];

  if (!job) {
    return res.json({
      job_id: req.params.jobId,
      status: "processing",
      clips: [],
    });
  }

  res.json(job);
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
