import { useEffect, useRef, useState } from "react";
import {
  FaGithub,
  FaLinkedin,
  FaEnvelope,
  FaGlobe,
  FaPlay,
  FaPause,
  FaStepBackward,
  FaStepForward,
} from "react-icons/fa";
import CameraBox from "./components/CameraBox";
import SpotifyButton from "./components/SpotifyButton";
import {
  createFaceLandmarker,
  detectFaceMood,
} from "./utils/faceDetection";
import { exchangeCodeForToken, getSpotifyToken } from "./utils/auth";
import {
  createSpotifyPlayer,
  transferPlayback,
  playPlaylist,
  disconnectSpotifyPlayer,
  activateSpotifyElement,
  togglePlayback,
  nextTrack,
  previousTrack,
  waitForDevice,
} from "./utils/spotify";
import "./index.css";

function App() {
  const videoRef = useRef(null);
  const spotifyHandledRef = useRef(false);

  const [mood, setMood] = useState("Loading model...");
  const [manualMood, setManualMood] = useState(null);
  const [debugText, setDebugText] = useState("Waiting for camera...");
  const [spotifyStatus, setSpotifyStatus] = useState("Not Connected");
  const [deviceId, setDeviceId] = useState("");
  const [currentTrack, setCurrentTrack] = useState(null);

  const moodData = {
    Happy: {
      uri: "spotify:playlist:37i9dQZF1DXdPec7aLTmlC",
      url: "https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC",
      title: "Happy Hits",
      description: "Upbeat feel-good tracks for a happy mood.",
    },
    Neutral: {
      uri: "spotify:playlist:37i9dQZF1DX889U0CL85jj",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj",
      title: "Chill Vibes",
      description: "Balanced relaxed tracks for a neutral mood.",
    },
    Angry: {
      uri: "spotify:playlist:37i9dQZF1DX76Wlfdnj7AP",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP",
      title: "Rock Hard",
      description: "High-energy tracks for an intense mood.",
    },
    Surprised: {
      uri: "spotify:playlist:37i9dQZF1DX0BcQWzuB7ZO",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX0BcQWzuB7ZO",
      title: "Energy Booster",
      description: "Fresh energetic tracks for a surprised mood.",
    },
    "No face detected": {
      uri: "spotify:playlist:37i9dQZF1DX889U0CL85jj",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj",
      title: "Chill Vibes",
      description: "Default playlist while no face is detected.",
    },
    "Model ready": {
      uri: "spotify:playlist:37i9dQZF1DX889U0CL85jj",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj",
      title: "Chill Vibes",
      description: "Default playlist while the model is ready.",
    },
    "Loading model...": {
      uri: "spotify:playlist:37i9dQZF1DX889U0CL85jj",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj",
      title: "Chill Vibes",
      description: "Default playlist while the model loads.",
    },
    "Model failed to load": {
      uri: "spotify:playlist:37i9dQZF1DX889U0CL85jj",
      url: "https://open.spotify.com/playlist/37i9dQZF1DX889U0CL85jj",
      title: "Chill Vibes",
      description: "Default playlist while the model fails to load.",
    },
  };

  const selectableMoods = ["Happy", "Neutral", "Angry", "Surprised"];
  const activeMood = manualMood || mood;
  const activeMoodData = moodData[activeMood] || moodData.Neutral;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    async function handleSpotifyCallback() {
      if (spotifyHandledRef.current) return;
      spotifyHandledRef.current = true;

      try {
        if (error) {
          setSpotifyStatus("Spotify Error");
          return;
        }

        if (code) {
          const tokenData = await exchangeCodeForToken(code);

          if (tokenData.access_token) {
            setSpotifyStatus("Spotify Connected");
            window.history.replaceState({}, document.title, "/");
          } else {
            setSpotifyStatus("Spotify Login Failed");
          }
        } else if (getSpotifyToken()) {
          setSpotifyStatus("Spotify Connected");
        }
      } catch (err) {
        console.error("Spotify callback error:", err);
        setSpotifyStatus("Spotify Login Failed");
      }
    }

    handleSpotifyCallback();
  }, []);

  useEffect(() => {
    let intervalId;

    async function setupDetection() {
      try {
        await createFaceLandmarker();
        setMood("Model ready");
        setDebugText("Model loaded. Waiting for face detection...");

        intervalId = setInterval(async () => {
          const video = videoRef.current;

          if (!video) {
            setDebugText("Video ref not found");
            return;
          }

          if (video.readyState < 4) {
            setDebugText("Video not fully ready yet");
            return;
          }

          const result = await detectFaceMood(video);

          if (!result) {
            setDebugText("No result returned");
            return;
          }

          if (!manualMood) {
            setMood(result.mood || "Neutral");
          }

          if (result.topScores && result.topScores.length > 0) {
            const text = result.topScores
              .slice(0, 5)
              .map(
                (item) => `${item.categoryName}: ${Number(item.score).toFixed(2)}`
              )
              .join(" | ");

            setDebugText(text);
          } else {
            setDebugText("Face detected but no blendshape scores found");
          }
        }, 500);
      } catch (error) {
        console.error("Face detection setup error:", error);
        setMood("Model failed to load");
        setDebugText("Check console for error");
      }
    }

    setupDetection();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [manualMood]);

  useEffect(() => {
    let mounted = true;

    async function setupSpotifyPlayer() {
      if (!getSpotifyToken()) return;

      try {
        setSpotifyStatus("Spotify Player Loading...");

        await createSpotifyPlayer(
          (newDeviceId) => {
            if (!mounted) return;
            setDeviceId(newDeviceId);
            setSpotifyStatus("Spotify Player Ready");
          },
          () => {
            if (!mounted) return;
            setSpotifyStatus("Spotify Player Not Ready");
          },
          (state) => {
            if (!state || !mounted) return;

            const track = state.track_window?.current_track;
            if (track) {
              setCurrentTrack({
                name: track.name,
                artist: track.artists?.map((a) => a.name).join(", ") || "",
                album: track.album?.name || "",
                image: track.album?.images?.[0]?.url || "",
                durationMs: track.duration_ms || 0,
                positionMs: state.position || 0,
                paused: state.paused,
              });
            }
          }
        );
      } catch (error) {
        console.error("Spotify player setup failed:", error);
        if (mounted) {
          setSpotifyStatus("Spotify Player Setup Failed");
        }
      }
    }

    setupSpotifyPlayer();

    return () => {
      mounted = false;
      disconnectSpotifyPlayer();
    };
  }, [spotifyStatus === "Spotify Connected"]);

  async function handlePlayMoodMusic() {
    try {
      if (!deviceId) {
        setSpotifyStatus("No Spotify Device Yet");
        return;
      }

      activateSpotifyElement();
      setSpotifyStatus("Preparing Spotify device...");
      const deviceReady = await waitForDevice(deviceId, 12, 1000);
      if (!deviceReady) {
        setSpotifyStatus("Spotify device not found yet");
        return;
      }


      const transferResponse = await transferPlayback(deviceId);
      console.log("Transfer playback status:", transferResponse.status);

      if (!transferResponse.ok && transferResponse.status !== 204) {
        const transferError = await transferResponse.json().catch(() => ({}));
        console.log("Transfer playback error:", transferError);
        setSpotifyStatus(
          `Transfer Failed: ${transferError?.error?.reason || transferResponse.status}`
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const playResponse = await playPlaylist(deviceId, activeMoodData.uri);
      console.log("Play response status:", playResponse.status);

      if (playResponse.ok || playResponse.status === 204) {
        setSpotifyStatus(`Playing for mood: ${activeMood}`);
      } else {
        const errorData = await playResponse.json().catch(() => ({}));
        console.log("Play error:", errorData);
        setSpotifyStatus("Playback Failed");
      }
    } catch (error) {
      console.error("Play music error:", error);
      setSpotifyStatus(
        `Playback Failed: ${errorData?.error?.reason || playResponse.status}`
      );
    }
  } catch (error) {
    console.error("Play music error:", error);
    setSpotifyStatus("Playback Failed");
  }
}

  async function handleTogglePlayback() {
    try {
      activateSpotifyElement();
      await togglePlayback();
    } catch (error) {
      console.error("Toggle playback error:", error);
    }
  }

  async function handleNextTrack() {
    try {
      await nextTrack();
    } catch (error) {
      console.error("Next track error:", error);
    }
  }

  async function handlePreviousTrack() {
    try {
      await previousTrack();
    } catch (error) {
      console.error("Previous track error:", error);
    }
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor((ms || 0) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  const progressPercent =
    currentTrack && currentTrack.durationMs
      ? Math.min(
          100,
          ((currentTrack.positionMs || 0) / currentTrack.durationMs) * 100
        )
      : 0;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">♪</div>
          <span className="brand-text">Moodora AI</span>
        </div>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#demo">Demo</a>
          <a href="#about">About</a>
        </nav>

        <div className="topbar-right">
          <div className="status-chip">{spotifyStatus}</div>
          <SpotifyButton />
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-left">
          <div className="hero-badge">AI-Powered Music Experience</div>

          <h1 className="hero-title">
            Your mood.
            <br />
            Your music.
            <br />
            <span>Instantly.</span>
          </h1>

          <p className="hero-subtitle">
            Moodora AI uses advanced AI to read your facial expressions in
            real-time and curates the perfect Spotify playlist to match exactly
            how you're feeling.
          </p>

          <div className="hero-buttons">
            <a href="#demo" className="hero-primary">
              Try Moodora
            </a>

            <div className="hero-secondary-wrap">
              <SpotifyButton />
            </div>
          </div>

          <div className="portfolio-note">
             Portfolio Project by <strong>Rangan Pratik Borah</strong>
             <br />
             <span className="portfolio-subtitle">
                B. Tech Electronics and Communication Engineering Student
             </span>

            <div className="icon-links">
              <a
                href="https://github.com/RanganBorah"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <FaGithub />
              </a>

              <a
                href="https://www.linkedin.com/in/rangan-pratik-borah-69957b375/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
              >
                <FaLinkedin />
              </a>

              <a
                href="mailto:ranganpratikborah2006@gmail.com"
                aria-label="Email"
              >
                <FaEnvelope />
              </a>

              <a
                href="https://resume-ranganpb.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Portfolio Website"
              >
                <FaGlobe />
              </a>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-visual-card">
            <div className="floating-icon top">😊</div>
            <div className="floating-icon right">🎵</div>
            <div className="floating-icon left">🎧</div>
            <div className="floating-icon bottom">✨</div>

            <div className="wave-bars">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="works-section" id="features">
        <h2>How Moodora AI Works</h2>
        <p>
          Powered by cutting-edge AI and seamless Spotify integration for the
          ultimate mood-based music experience.
        </p>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">⌗</div>
            <h3>Real-time Detection</h3>
            <p>
              Advanced AI analyzes your facial expressions instantly and
              identifies your emotional state.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">♪</div>
            <h3>Spotify Integration</h3>
            <p>
              Seamlessly connects with your Spotify account to access playlists
              and music.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Matching</h3>
            <p>
              Instantly matches your detected mood to the perfect playlist with
              no manual searching.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">▢</div>
            <h3>Responsive Design</h3>
            <p>
              Beautiful clean interface that works across desktop and mobile.
            </p>
          </div>
        </div>
      </section>

      <section className="demo-section" id="demo">
        <h2>Try the Demo</h2>
        <p>
          Experience how Moodora AI detects your mood and recommends the perfect
          music for you.
        </p>

        <div className="demo-grid">
          <div className="demo-camera-card">
            <CameraBox videoRef={videoRef} />
          </div>

          <div className="demo-side-card">
            <div className="detected-label">Detected Mood</div>

            <div
              className={`detected-mood mood-${activeMood
                .toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[.]/g, "")}`}
            >
              {activeMood}
              {manualMood ? " (Manual)" : ""}
            </div>

            <div className="manual-mood-section">
              <div className="manual-mood-title">Choose mood manually</div>
              <div className="manual-mood-buttons">
                {selectableMoods.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`manual-mood-btn ${
                      manualMood === item ? "active" : ""
                    }`}
                    onClick={() => setManualMood(item)}
                  >
                    {item}
                  </button>
                ))}
                <button
                  type="button"
                  className={`manual-mood-btn ${manualMood === null ? "active" : ""}`}
                  onClick={() => setManualMood(null)}
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="debug-line">{debugText}</div>

            <button className="play-main-btn" onClick={handlePlayMoodMusic}>
              Play for my mood
            </button>

            <button
              className="analyze-btn"
              onClick={() => setManualMood(null)}
            >
              Switch Back to Auto Detection
            </button>
          </div>
        </div>

        <div className="music-grid">
          <div className="music-card spotify-style-card">
            <h3>Now Playing</h3>

            {currentTrack?.image ? (
              <img
                src={currentTrack.image}
                alt={currentTrack.name}
                className="album-art"
              />
            ) : (
              <div className="music-placeholder">♪</div>
            )}

            <h4>{currentTrack?.name || "No song playing"}</h4>
            <p>{currentTrack?.artist || "Select a mood to start"}</p>

            <div className="music-progress">
              <div
                className="music-progress-fill"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <div className="music-time-row">
              <span>{formatTime(currentTrack?.positionMs || 0)}</span>
              <span>{formatTime(currentTrack?.durationMs || 0)}</span>
            </div>

            <div className="music-controls polished-controls">
              <button
                className="control-btn"
                onClick={handlePreviousTrack}
                aria-label="Previous"
                type="button"
              >
                <FaStepBackward />
              </button>

              <button
                className="play-circle polished-play-circle"
                onClick={handleTogglePlayback}
                aria-label={currentTrack?.paused ? "Play" : "Pause"}
                type="button"
              >
                {currentTrack?.paused ? <FaPlay /> : <FaPause />}
              </button>

              <button
                className="control-btn"
                onClick={handleNextTrack}
                aria-label="Next"
                type="button"
              >
                <FaStepForward />
              </button>
            </div>
          </div>

          <div className="music-card spotify-style-card">
            <h3>Recommended Playlist</h3>
            <div className="music-placeholder">♫</div>
            <h4>{activeMoodData.title}</h4>
            <p>{activeMoodData.description}</p>

            <a
              className="spotify-open-btn"
              href={activeMoodData.url}
              target="_blank"
              rel="noreferrer"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      </section>

      <footer className="footer" id="about">
        <div className="footer-top">
          <div>
            <div className="footer-brand">
              <div className="brand-icon">♪</div>
              <span>Moodora AI</span>
            </div>

            <p className="footer-text">
              AI-powered mood detection meets music. Your emotions, your
              soundtrack.
            </p>

            <p className="footer-text small">
              Portfolio Project by Rangan
            </p>
          </div>

          <div className="footer-links">
            <a
              href="https://www.linkedin.com/in/rangan-pratik-borah-69957b375/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedin />
            </a>

            <a
              href="https://github.com/RanganBorah"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <FaGithub />
            </a>

            <a
              href="mailto:ranganpratikborah2006@gmail.com"
              aria-label="Email"
            >
              <FaEnvelope />
            </a>

            <a
              href="https://resume-ranganpb.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Portfolio Website"
            >
              <FaGlobe />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 Moodora AI. Built with passion for music and technology.
        </div>
      </footer>
    </div>
  );
}

export default App;