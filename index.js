import express from "express";
import cors from "cors";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

ffmpeg.setFfmpegPath(ffmpegPath);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   STORAGE
========================================================= */
const jobs = {};

const CLIP_DIR = path.join(__dirname, "clips");
if (!fs.existsSync(CLIP_DIR)) fs.mkdirSync(CLIP_DIR);

/* =========================================================
   CUT REAL CLIP FUNCTION
========================================================= */
function cutClip(inputUrl, start, duration, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputUrl)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
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

    const clipCount =
      Number(req.body.clipCount) ||
      Number(settings?.clipCount) ||
      5;

    const jobId = crypto.randomUUID();

    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      clips: [],
    };

    res.json({
      job_id: jobId,
      status: "processing",
    });

    // 🔥 REAL PROCESSING
    const clips = [];

    for (let i = 0; i < clipCount; i++) {
      const start = i * 20;
      const duration = 20;
      const outputFile = `clip_${jobId}_${i}.mp4`;
      const outputPath = path.join(CLIP_DIR, outputFile);

      await cutClip(video_url, start, duration, outputPath);

      clips.push({
        id: crypto.randomUUID(),
        url: `${req.protocol}://${req.get("host")}/clips/${outputFile}`,
        thumbnail: "https://placehold.co/600x400",
        title: `AI Clip ${i + 1}`,
        start_time: start,
        end_time: start + duration,
        duration,
        viral_score: Math.floor(Math.random() * 100),
      });
    }

    jobs[jobId] = {
      job_id: jobId,
      status: "completed",
      clips,
    };

  } catch (err) {
    console.error(err);
  }
});

/* =========================================================
   STATUS ROUTE
========================================================= */
app.get("/status/:jobId", (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/* =========================================================
   SERVE CLIPS
========================================================= */
app.use("/clips", express.static(CLIP_DIR));

/* =========================================================
   START SERVER
========================================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
