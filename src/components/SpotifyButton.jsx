import { redirectToSpotifyLogin } from "../utils/auth";

export default function SpotifyButton() {
  return (
    <button
      onClick={redirectToSpotifyLogin}
      style={{
        padding: "14px 22px",
        borderRadius: "999px",
        border: "none",
        background: "#41d353",
        color: "#041008",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: "0 0 24px rgba(65, 211, 83, 0.18)",
      }}
    >
      Connect Spotify
    </button>
  );
}