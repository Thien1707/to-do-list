import { useEffect, useRef } from 'react';

let activeModalCount = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function lockBackgroundScroll() {
  if (activeModalCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    savedHtmlOverflow = html.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedBodyPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - html.clientWidth;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
  }
  activeModalCount += 1;
}

function unlockBackgroundScroll() {
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.documentElement.style.overflow = savedHtmlOverflow;
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.paddingRight = savedBodyPaddingRight;
  }
}

/**
 * Reusable modal backdrop wrapper:
 * - Prevents closing when dragging/highlighting text inside a modal and releasing on the backdrop.
 * - Locks background page scroll and prevents scroll chaining to underlying content.
 */
export default function ModalOverlay({
  onClose,
  className = 'modal-overlay',
  style,
  children,
  ...rest
}) {
  const mouseDownOnBackdrop = useRef(false);

  useEffect(() => {
    lockBackgroundScroll();
    return () => unlockBackgroundScroll();
  }, []);

  const handleMouseDown = (e) => {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  };

  const handleClick = (e) => {
    if (mouseDownOnBackdrop.current && e.target === e.currentTarget && onClose) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  };

  return (
    <div
      className={className}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{ overscrollBehavior: 'contain', ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

