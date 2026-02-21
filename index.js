import express from "express";
import cors from "cors";
import crypto from "crypto";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =========================================================
   STORAGE
========================================================= */

const jobs = {};

const __dirname = new URL('.', import.meta.url).pathname;
const CLIP_DIR = path.join(__dirname, "clips");

if (!fs.existsSync(CLIP_DIR)) {
  fs.mkdirSync(CLIP_DIR);
}

app.use("/clips", express.static(CLIP_DIR));

/* =========================================================
   UTIL: RUN COMMAND
========================================================= */

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

/* =========================================================
   ROUTES
========================================================= */

app.get("/", (req, res) => {
  res.json({ status: "AI Clip Backend Running 🚀" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
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
      2;

    const aspect = settings?.aspect_ratio || "9:16";
    const captionsEnabled = settings?.auto_captions || false;

    const jobId = crypto.randomUUID();

    jobs[jobId] = {
      job_id: jobId,
      status: "processing",
      clips: [],
    };

    res.json({ job_id: jobId, status: "processing" });

    // 🔥 Background processing
    (async () => {
      try {
        const videoPath = path.join(CLIP_DIR, `${jobId}.mp4`);

        // 1️⃣ Download YouTube video
        await runCommand(
          `yt-dlp -f mp4 -o "${videoPath}" "${video_url}"`
        );

        const clips = [];

        for (let i = 0; i < clipCount; i++) {
          const start = i * 30;
          const duration = 30;
          const outputPath = path.join(CLIP_DIR, `${jobId}_clip_${i}.mp4`);

          let scaleFilter = "";

          if (aspect === "9:16") scaleFilter = "scale=1080:1920";
          if (aspect === "16:9") scaleFilter = "scale=1920:1080";
          if (aspect === "1:1") scaleFilter = "scale=1080:1080";
          if (aspect === "4:5") scaleFilter = "scale=1080:1350";

          await runCommand(
            `ffmpeg -ss ${start} -t ${duration} -i "${videoPath}" -vf "${scaleFilter}" -c:a copy "${outputPath}" -y`
          );

          // 2️⃣ Add captions if enabled
          if (captionsEnabled) {
            await runCommand(
              `whisper "${outputPath}" --model tiny --output_format srt`
            );

            const srtFile = outputPath.replace(".mp4", ".srt");

            await runCommand(
              `ffmpeg -i "${outputPath}" -vf subtitles="${srtFile}" "${outputPath.replace(".mp4", "_captioned.mp4")}" -y`
            );
          }

          clips.push({
            id: crypto.randomUUID(),
            url: `${req.protocol}://${req.get("host")}/clips/${path.basename(outputPath)}`,
            title: `AI Clip ${i + 1}`,
            start_time: start,
            end_time: start + duration,
            duration,
          });
        }

        jobs[jobId] = {
          job_id: jobId,
          status: "completed",
          clips,
        };

      } catch (err) {
        console.error(err);
        jobs[jobId] = {
          job_id: jobId,
          status: "failed",
          clips: [],
        };
      }
    })();

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
