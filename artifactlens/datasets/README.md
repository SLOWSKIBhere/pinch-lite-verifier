# Dataset governance

Do not commit video files, extracted frames, transcripts, or copyrighted media into this repository unless the license and permission explicitly allow it.

For each evaluation item, keep a local record with:
- opaque item ID;
- source URL and access date (where permitted);
- license / permission basis;
- source media SHA-256;
- annotator and review date;
- reference OCR text and text-region boxes;
- expected timestamp(s);
- claim labels and source citations (later phase);
- split assignment at the video level.

Keep raw media outside Git. Commit only small, redistributable synthetic fixtures or metadata that can legally be shared. Avoid private, personal, or identifying video content.
