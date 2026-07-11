# Toile patterns (E&M coastal)

Drop the couple's two toile PNGs here — they're referenced by the `.toile-veil`
utility in `src/app/globals.css` (login screen + empty states):

- `toile-white.png` — blue line-art toile on a white ground (used in light theme)
- `toile-navy.png`  — white line-art toile on a blue/navy ground (used in dark theme)

Until both files exist, the veil degrades gracefully to the plain background
(a missing CSS `background-image` renders nothing — no broken icons).
