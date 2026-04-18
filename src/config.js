const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

export const spotifyConfig = {
  clientId: "35b6278bab4841a8b48391e099e79e1f",
  redirectUri: isLocal
    ? "http://127.0.0.1:5173/"
    : "https://moodora-ai.vercel.app/",
  scopes: [
    "streaming",
    "user-read-email",
    "user-read-private",
    "user-modify-playback-state",
    "user-read-playback-state",
  ],
};