import { getSpotifyToken } from "./auth";

let playerInstance = null;

export function loadSpotifyPlayer() {
  return new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve(window.Spotify);
      return;
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve(window.Spotify);
    };

    setTimeout(() => {
      if (!window.Spotify) {
        reject(new Error("Spotify SDK failed to load"));
      }
    }, 10000);
  });
}

export async function createSpotifyPlayer(onReady, onNotReady, onStateChange) {
  const Spotify = await loadSpotifyPlayer();
  const token = getSpotifyToken();

  if (!token) {
    throw new Error("No Spotify access token found");
  }

  const player = new Spotify.Player({
    name: "Moodora AI Player",
    getOAuthToken: (cb) => {
      cb(getSpotifyToken());
    },
    volume: 0.6,
  });

  player.addListener("ready", ({ device_id }) => {
    console.log("Spotify player ready:", device_id);
    if (onReady) onReady(device_id);
  });

  player.addListener("not_ready", ({ device_id }) => {
    console.log("Spotify player not ready:", device_id);
    if (onNotReady) onNotReady(device_id);
  });

  player.addListener("player_state_changed", (state) => {
    console.log("player_state_changed:", state);
    if (onStateChange) onStateChange(state);
  });

  player.addListener("autoplay_failed", () => {
    console.log("Autoplay failed - browser blocked playback");
  });

  player.addListener("initialization_error", ({ message }) => {
    console.error("Initialization error:", message);
  });

  player.addListener("authentication_error", ({ message }) => {
    console.error("Authentication error:", message);
  });

  player.addListener("account_error", ({ message }) => {
    console.error("Account error:", message);
  });

  await player.connect();
  playerInstance = player;

  return player;
}

export function activateSpotifyElement() {
  if (playerInstance && typeof playerInstance.activateElement === "function") {
    playerInstance.activateElement();
  }
}

export async function transferPlayback(deviceId) {
  const token = getSpotifyToken();

  return fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: false,
    }),
  });
}

export async function playPlaylist(deviceId, playlistUri) {
  const token = getSpotifyToken();

  return fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        context_uri: playlistUri,
      }),
    }
  );
}

export function disconnectSpotifyPlayer() {
  if (playerInstance) {
    playerInstance.disconnect();
    playerInstance = null;
  }
}
export async function togglePlayback() {
  if (playerInstance) {
    return playerInstance.togglePlay();
  }
}

export async function nextTrack() {
  if (playerInstance) {
    return playerInstance.nextTrack();
  }
}

export async function previousTrack() {
  if (playerInstance) {
    return playerInstance.previousTrack();
  }
}