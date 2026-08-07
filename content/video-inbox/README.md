# Video inbox

Drop real clips from the tours here — phone-grade is fine.

**Only genuine footage of our own places and tours.** No stock, no generated
video. An empty ambient slot waits for the real thing; it is never filled with
something that pretends to be Crete.

Checked at the start of every build increment. When files land:

1. Verify each clip actually depicts the place/tour it will be presented as.
2. Transcode to `webm` + `mp4`, muted, `autoplay`, `loop`, with a poster frame.
   Target ≤ 2–3 MB per loop, lazy-loaded.
3. Grade to direction B via `qa/grade.ps1` so footage matches the stills.
4. Slot into the ambient scenes it fits.
5. Add a ledger entry in `CONTENT_INVENTORY.md` marked **owner footage**.

Under `prefers-reduced-motion`, the poster frame shows and the video never
plays.
