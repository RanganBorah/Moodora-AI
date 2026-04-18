import { useEffect } from "react";

export default function CameraBox({ videoRef }) {
  useEffect(() => {
    let stream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (videoRef && videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Camera error:", error);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: "100%",
        minHeight: "460px",
        objectFit: "cover",
        borderRadius: "20px",
        display: "block",
        background: "#0b0f15",
      }}
    />
  );
}