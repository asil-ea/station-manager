"use client";

import { useNProgress } from "@tanem/react-nprogress";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import "./page-loader.css";

const Bar: React.FC<{
  progress: number;
}> = ({ progress }) => (
  <div
    className="nprogress-bar"
    style={{
      marginLeft: `${(-1 + progress) * 100}%`,
    }}
  >
    <div className="nprogress-bar-peg" />
  </div>
);

const Container: React.FC<
  React.PropsWithChildren<{
    isFinished: boolean;
  }>
> = ({ children, isFinished }) => (
  <div className={`nprogress-container ${isFinished ? "" : "animating"}`}>
    {children}
  </div>
);

const Progress: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  const { isFinished, progress } = useNProgress({
    isAnimating,
  });

  return (
    <Container isFinished={isFinished}>
      <Bar progress={progress} />
    </Container>
  );
};

export const PageLoader: React.FC = () => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialRender = React.useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    setIsAnimating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      try {
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");
        if (anchor) {
          const href = anchor.getAttribute("href");
          if (href && href.startsWith("/") && !href.startsWith("/#")) {
            setIsAnimating(true);
          }
        }
      } catch {
        setIsAnimating(true);
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return <Progress isAnimating={isAnimating} />;
};