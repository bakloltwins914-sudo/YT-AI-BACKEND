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

function generateSmartTitle(index) {
  const hooks = [
    "This Changed Everything",
    "Nobody Talks About This",
    "The Hidden Truth",
    "This Was Unexpected",
    "The Most Important Moment",
    "This Is Crazy",
    "You Won't Believe This",
    "This Part Is Insane"
  ];

  const randomHook = hooks[Math.floor(Math.random() * hooks.length)];

  return `${randomHook} (#${index})`;
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
   PROCESS ROUTE (SMART TIMESTAMP VERSION)
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

    // 🔥 FIXED SLIDER HANDLING
    const clipCount =
      Number(req.body.clipCount) ||
      Number(settings?.clipCount) ||
      Number(settings?.number_of_clips) ||
      Number(settings?.clips) ||
      3;

    // Safety limits
    const safeClipCount = Math.min(Math.max(clipCount, 1), 10);

    const jobId = crypto.randomUUID();

    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      clips: [],
    };

    res.json({ job_id: jobId, status: "processing" });

    // 🔥 Background AI-like processing
    setTimeout(() => {
      try {
        const clips = [];

        // Simulated video length (30 mins)
        const simulatedVideoLength = 1800;
        const duration = 30;

        const usedStarts = new Set();

        for (let i = 0; i < safeClipCount; i++) {

          let start;

          // Spread clips randomly across full video
          do {
            start = Math.floor(
              Math.random() * (simulatedVideoLength - duration)
            );
          } while (usedStarts.has(start));

          usedStarts.add(start);

          const end = start + duration;

          clips.push({
            id: crypto.randomUUID(),
            title: generateSmartTitle(i + 1),
            start_time: start,
            end_time: end,
            duration,
            url: `https://www.youtube.com/watch?v=${videoId}&t=${start}s`,
          });
        }

        jobs[jobId] = {
          job_id: jobId,
          status: "completed",
          clips,
        };

      } catch (err) {
        console.error("PROCESS FAILED:", err);
        jobs[jobId] = {
          job_id: jobId,
          status: "failed",
          clips: [],
        };
      }
    }, 1500);

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
