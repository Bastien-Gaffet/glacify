/**
 * The playful side (on by default, Moi > Préférences): the summary with its
 * podium offered at the end of the service, the confetti and the fanfare when
 * a tub goes back in the freezer. Off, the service goes straight to the point.
 */
const STORAGE_KEY = "glacify-playful";

export function playfulOn() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setPlayfulOn(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}
