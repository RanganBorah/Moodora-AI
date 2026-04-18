import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let faceLandmarker = null;
let lastVideoTime = -1;

export async function createFaceLandmarker() {
  if (faceLandmarker) return faceLandmarker;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/models/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  });

  return faceLandmarker;
}

export async function detectFaceMood(videoElement) {
  if (!faceLandmarker || !videoElement) return null;

  if (videoElement.currentTime === lastVideoTime) return null;
  lastVideoTime = videoElement.currentTime;

  const results = faceLandmarker.detectForVideo(
    videoElement,
    performance.now()
  );

  console.log("Raw results:", results);

  if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) {
    return {
      mood: "No face detected",
      topScores: [],
      scores: {},
    };
  }

  const categories = results.faceBlendshapes[0].categories;

  const topScores = [...categories]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const scores = Object.fromEntries(
    categories.map((item) => [item.categoryName, item.score])
  );

  const smileLeft = scores.mouthSmileLeft || 0;
  const smileRight = scores.mouthSmileRight || 0;
  const jawOpen = scores.jawOpen || 0;
  const browUp = scores.browInnerUp || 0;
  const browDownLeft = scores.browDownLeft || 0;
  const browDownRight = scores.browDownRight || 0;

  let mood = "Neutral";

  if (smileLeft > 0.15 || smileRight > 0.15) {
    mood = "Happy";
  } else if (browUp > 0.15 && jawOpen > 0.15) {
    mood = "Surprised";
  } else if (browDownLeft > 0.15 || browDownRight > 0.15) {
    mood = "Angry";
  }

  return {
    mood,
    topScores,
    scores,
  };
}