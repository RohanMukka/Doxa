#!/usr/bin/env python3
"""Cut a voiceover to the picture.

record.js writes a timeline.json of when each caption appears. narration.json
gives a line of speech a start time on that same clock. This synthesises each
line, lays it on a silent track at its cue, and muxes the result onto the video,
so the narration is aligned to the edit rather than read over it and hoped for.

Needs festival with the HTS voice, and ffmpeg:

    apt-get install -y festival festvox-us-slt-hts ffmpeg
    python3 scripts/demo-video/narrate.py <video> <output.mp4>
"""

import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = "(begin (voice_cmu_us_slt_arctic_hts) (Parameter.set 'Duration_Stretch 1.12))"

# Festival's leading silence, measured. Cues are written against the caption
# times, so the clips are pulled back by this much to make the speech land there.
LEAD_IN = 0.19


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    video, output = sys.argv[1], sys.argv[2]
    lines = json.load(open(os.path.join(HERE, "narration.json")))
    total = duration(video)

    with tempfile.TemporaryDirectory() as tmp:
        clips = []
        for i, (cue, text) in enumerate(lines):
            txt = os.path.join(tmp, f"{i:02d}.txt")
            wav = os.path.join(tmp, f"{i:02d}.wav")
            open(txt, "w").write(text + "\n")
            subprocess.run(["text2wave", "-eval", VOICE, txt, "-o", wav],
                           check=True, capture_output=True)
            clips.append((max(0.0, cue - LEAD_IN), duration(wav), wav))

        # Warn rather than fail: a line that runs into the next cue is a script
        # problem to fix in narration.json, not a reason to refuse to build.
        for (start, length, _), (nxt, _) in zip(clips, [(c[0], 0) for c in clips[1:]] + [(total, 0)]):
            if start + length > nxt + 0.1:
                print(f"warning: line at {start:.1f}s runs {start + length - nxt:.2f}s "
                      f"past the next cue", file=sys.stderr)

        inputs, filters, labels = [], [], []
        for i, (start, length, wav) in enumerate(clips):
            inputs += ["-i", wav]
            ms = int(round(start * 1000))
            filters.append(
                f"[{i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=mono,"
                f"afade=t=in:st=0:d=0.05,afade=t=out:st={max(0, length - 0.08):.3f}:d=0.08,"
                f"adelay={ms}|{ms},pan=stereo|c0=c0|c1=c0[a{i}]"
            )
            labels.append(f"[a{i}]")

        graph = (
            ";".join(filters) + ";" + "".join(labels)
            + f"amix=inputs={len(clips)}:normalize=0:dropout_transition=0[mix];"
            "[mix]highpass=f=85,lowpass=f=11000,"
            "acompressor=threshold=0.12:ratio=3:attack=12:release=180,"
            f"loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur={total:.3f},atrim=0:{total:.3f}[vo]"
        )
        track = os.path.join(tmp, "narration.wav")
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *inputs,
                        "-filter_complex", graph, "-map", "[vo]",
                        "-c:a", "pcm_s16le", track], check=True)

        subprocess.run([
            "ffmpeg", "-loglevel", "error", "-y", "-i", video, "-i", track,
            "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2",
            "-shortest", "-movflags", "+faststart", output,
        ], check=True)

    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
