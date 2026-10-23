"""Command-line entry point for the ArtifactLens local pipeline."""
from __future__ import annotations

import argparse
import json
import sys

from artifactlens.pipeline import PipelineError, process_video


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="artifactlens",
        description="Sample a local video, run OCR, and write provenance-bearing events.",
    )
    parser.add_argument("video", help="Path to a local video file")
    parser.add_argument("--out", required=True, help="Output directory")
    parser.add_argument(
        "--interval", type=float, default=2.0,
        help="Target seconds between sampled frames (default: 2.0)",
    )
    parser.add_argument(
        "--language", default="eng",
        help="Tesseract language code (default: eng; trained data must be installed)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        manifest = process_video(
            args.video, args.out, args.interval, args.language
        )
    except (PipelineError, ValueError, OSError) as exc:
        print(f"ArtifactLens error: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({
        "status": "INGESTED",
        "run_id": manifest["run_id"],
        "sampled_frame_count": manifest["sampled_frame_count"],
        "output_directory": args.out,
        "warning": "OCR observations are not verified historical claims.",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
