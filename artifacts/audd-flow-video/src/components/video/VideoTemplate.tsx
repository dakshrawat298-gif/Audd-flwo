import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS = {
  intro: 4500,
  dashboard: 4000,
  agent: 4500,
  security: 4000,
  outro: 4500,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  dashboard: Scene2,
  agent: Scene3,
  security: Scene4,
  outro: Scene5,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <div className="w-full h-screen overflow-hidden relative bg-black text-white">
      {/* Persistent Background Layer */}
      <div className="absolute inset-0 z-0">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        {/* Ambient moving blobs that react to scene changes */}
        <motion.div className="absolute rounded-full blur-[100px] pointer-events-none mix-blend-screen"
          animate={{
            x: ['-20vw', '40vw', '10vw', '60vw', '50vw'][sceneIndex],
            y: ['-10vh', '50vh', '80vh', '20vh', '50vh'][sceneIndex],
            scale: [1, 1.5, 0.8, 1.2, 2][sceneIndex],
            backgroundColor: [
              'rgba(0, 240, 255, 0.05)',
              'rgba(0, 240, 255, 0.08)',
              'rgba(0, 255, 170, 0.08)',
              'rgba(0, 255, 170, 0.05)',
              'rgba(0, 240, 255, 0.05)'
            ][sceneIndex],
            width: '40vw',
            height: '40vw'
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        <motion.div className="absolute rounded-full blur-[120px] pointer-events-none mix-blend-screen"
          animate={{
            x: ['60vw', '-10vw', '70vw', '10vw', '50vw'][sceneIndex],
            y: ['60vh', '10vh', '30vh', '70vh', '50vh'][sceneIndex],
            scale: [1.5, 1, 1.2, 0.9, 2][sceneIndex],
            backgroundColor: [
              'rgba(0, 255, 170, 0.03)',
              'rgba(0, 255, 170, 0.05)',
              'rgba(0, 240, 255, 0.05)',
              'rgba(0, 255, 170, 0.05)',
              'rgba(0, 240, 255, 0.03)'
            ][sceneIndex],
            width: '50vw',
            height: '50vw'
          }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
        />
      </div>

      <AnimatePresence mode="popLayout">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
