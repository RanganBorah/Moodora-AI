import { spotifyConfig } from "../config";

function generateRandomString(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";

  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i += 1) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function redirectToSpotifyLogin() {
  const verifier = generateRandomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));

  sessionStorage.setItem("spotify_code_verifier", verifier);

  const params = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    response_type: "code",
    redirect_uri: spotifyConfig.redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: spotifyConfig.scopes.join(" "),
  });

  window.location.assign(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}

export async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem("spotify_code_verifier");

  const body = new URLSearchParams({
    client_id: spotifyConfig.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: spotifyConfig.redirectUri,
    code_verifier: verifier || "",
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem("spotify_access_token", data.access_token);
  }
  if (data.refresh_token) {
    localStorage.setItem("spotify_refresh_token", data.refresh_token);
  }

  return data;
}

export function getSpotifyToken() {
  return localStorage.getItem("spotify_access_token");
}