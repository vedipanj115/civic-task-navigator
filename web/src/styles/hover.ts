// One hover treatment for every control, so timing never drifts per component. The scale is motion-safe;
// the colour/shadow change isn't movement, so it stays under prefers-reduced-motion.
export const HOVER = 'transition duration-150 ease-out motion-safe:hover:scale-[1.02]'

// Surfaces (cards, bordered or filled buttons) also lift their shadow. Bare text controls use HOVER alone:
// a box-shadow around unboxed text reads as a stray rectangle.
export const HOVER_LIFT = `${HOVER} hover:shadow-hover`
