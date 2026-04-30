import React, { useEffect, useRef } from 'react';

interface Props {
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  onComplete: () => void;
  isActive: boolean;
}

const CountdownTimer: React.FC<Props> = ({ timeLeft, setTimeLeft, onComplete, isActive }) => {
  const onCompleteRef = useRef(onComplete);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCompleteRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, setTimeLeft]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-red-200 text-lg mb-8">
        Sending alert in {timeLeft}s
      </p>
      <div className="text-8xl font-black text-white mb-12 drop-shadow-xl tabular-nums">
        {timeLeft}
      </div>
    </div>
  );
};

export default CountdownTimer;
