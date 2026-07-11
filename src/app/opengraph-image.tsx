import { ImageResponse } from "next/og";

// Social share card. Statically generated at build time (no request-time data),
// so it's cached and cheap. Uses the app's coastal palette; no external fonts.
export const alt = "Matt & Emma — Wedding Placement Planner";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #f3f6f9 0%, #dde6f2 55%, #cdddf0 100%)",
          color: "#223049",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 32,
            background: "#3a5c93",
            color: "#ffffff",
            fontSize: 84,
            fontStyle: "italic",
            marginBottom: 40,
          }}
        >
          &amp;
        </div>
        <div
          style={{
            fontSize: 30,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#6a7789",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          Just the two of us
        </div>
        <div style={{ fontSize: 78, marginTop: 18, fontWeight: 500 }}>
          Matt &amp; Emma
        </div>
        <div style={{ fontSize: 40, marginTop: 12, color: "#3a5c93" }}>
          Wedding Placement Planner
        </div>
      </div>
    ),
    { ...size },
  );
}
