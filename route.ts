@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer components {
  /* Subtle animated pulse for live indicator */
  .live-dot {
    @apply w-2 h-2 rounded-full bg-green-400 inline-block;
    animation: livepulse 2s ease-in-out infinite;
  }
}

@keyframes livepulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
