import { useEffect, useRef } from "react";

/* =========================================================
   KEYBOARD INPUT HOOK
========================================================= */

export function useKeyboardInput() {
  const keys = useRef({});

  useEffect(() => {
    const keyDown = (event) => {
      keys.current[
        event.key.toLowerCase()
      ] = true;

      if (event.code === "Space") {
        keys.current.space = true;
      }
    };

    const keyUp = (event) => {
      keys.current[
        event.key.toLowerCase()
      ] = false;

      if (event.code === "Space") {
        keys.current.space = false;
      }
    };

    window.addEventListener(
      "keydown",
      keyDown
    );

    window.addEventListener(
      "keyup",
      keyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        keyDown
      );

      window.removeEventListener(
        "keyup",
        keyUp
      );
    };
  }, []);

  return keys;
}
