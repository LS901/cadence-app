import { ImageResponse } from "next/og";
import { CadencePreviewMark, PreviewPill } from "@/lib/social-preview";

export const alt = "Cadence calm analytics and reflective tracking preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(145deg, #0d1718 0%, #1b3338 60%, #77aea2 100%)",
          color: "#f6fbfa",
          padding: "52px",
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
            borderRadius: "30px",
            padding: "44px",
            background: "rgba(7, 14, 15, 0.22)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div
                  style={{
                    width: "88px",
                    height: "102px",
                    borderRadius: "28px",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CadencePreviewMark width={62} height={68} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ fontSize: "22px", letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.68 }}>
                    Cadence
                  </div>
                  <div style={{ fontSize: "22px", opacity: 0.76 }}>
                    Calm analytics for your inner life
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "68px", lineHeight: 1.04, fontWeight: 700, maxWidth: "780px" }}>
                Calm mood, habit, and reflection tracking.
              </div>
            </div>
            <div style={{ fontSize: "22px", opacity: 0.7 }}>Private pattern discovery</div>
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {[
              "Private by design",
              "Weekly reviews",
              "Pattern discovery",
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