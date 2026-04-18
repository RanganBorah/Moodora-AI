export default function MoodCard({ mood = "Neutral" }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: "320px",
        margin: "20px auto",
        padding: "18px",
        borderRadius: "16px",
        background: "#1a1a1a",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <h2 style={{ marginBottom: "8px" }}>Detected Mood</h2>
      <p style={{ fontSize: "1.2rem", color: "#7dd3fc" }}>{mood}</p>
    </div>
  );
}