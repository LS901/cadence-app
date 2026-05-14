import { ImageResponse } from "next/og";
import { CadencePreviewMark, PreviewPill } from "@/lib/social-preview";

export const alt = "Cadence calm analytics and reflective tracking preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0e1718 0%, #14282b 54%, #3d6b65 100%)",
          color: "#f6fbfa",
          padding: "56px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            borderRadius: "32px",
            border: "1px solid rgba(255,255,255,0.16)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            padding: "48px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  width: "92px",
                  height: "108px",
                  borderRadius: "28px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CadencePreviewMark width={68} height={74} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "22px", letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.7 }}>
                  Cadence
                </div>
                <div style={{ fontSize: "22px", opacity: 0.76 }}>
                  Calm analytics for your inner life
                </div>
              </div>
            </div>
            <div style={{ fontSize: "22px", opacity: 0.68 }}>Private pattern discovery</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "22px", maxWidth: "860px" }}>
            <div style={{ fontSize: "72px", lineHeight: 1.03, fontWeight: 700 }}>
              Track mood, habits, plans, and reflections in one calm workspace.
            </div>
            <div style={{ fontSize: "30px", lineHeight: 1.4, opacity: 0.82 }}>
              Built for private reflection, low-friction logging, and clearer weekly patterns.
            </div>
          </div>

          <div style={{ display: "flex", gap: "18px" }}>
            {[
              "Mood tracking",
              "Reflective journaling",
              "Habit consistency",
              "Weekly reviews",
            ].map((item) => (
              <PreviewPill key={item} label={item} />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}