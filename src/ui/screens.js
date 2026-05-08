/**
 * screens.js — Screen navigation manager
 * Handles transitions between the 4 app screens.
 */

const screens = {
  home: document.getElementById('screen-home'),
  capture: document.getElementById('screen-capture'),
  simulator: document.getElementById('screen-simulator'),
  result: document.getElementById('screen-result'),
};

let currentScreen = 'home';

/**
 * Navigate to a screen with smooth transition.
 * @param {string} targetId - Screen key: 'home' | 'capture' | 'simulator' | 'result'
 */
export function navigateTo(targetId) {
  if (targetId === currentScreen) return;

  const current = screens[currentScreen];
  const target = screens[targetId];

  if (!current || !target) return;

  // Exit current
  current.classList.remove('active');
  current.classList.add('exiting');

  // Enter target
  target.classList.add('active');

  // Clean up exit after transition
  setTimeout(() => {
    current.classList.remove('exiting');
  }, 450);

  currentScreen = targetId;
}

export function getCurrentScreen() {
  return currentScreen;
}
