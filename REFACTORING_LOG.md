## Entry 1
**Date:** 2026-09-19
**Issue:** DATABASE_URL in .env repeatedly got malformed during manual edits, and Neon DB credentials needed rotation after being exposed during setup/debugging.
**Fix:** Rewrote .env cleanly with DATABASE_URL, JWT_SECRET, PORT; rotated Neon password via dashboard; confirmed connection with prisma db push.
**File:** backend/.env