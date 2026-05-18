// JMT PixelRelay Style
//
// Two-pixel "relay race" accent effect: pixel 0 flashes COLOR_A for COUNT_A
// flashes while pixel 1 stays dark, then pixel 1 flashes COLOR_B for COUNT_B
// flashes while pixel 0 stays dark. The cycle repeats. Both pixels share a
// single flash heartbeat (FLASH_PERIOD_MS), so the off pixel is simply
// transparent while it is not its turn.
//
// Designed for the Luke ROTJ cave-scene arrow accent on a 2-LED accent strip,
// but works as a general-purpose alternating two-pixel flasher.
//
// Off pixels return RGBA_um_nod::Transparent() so PixelRelay composes cleanly
// inside Layers<>. Use it as a top-level StylePtr<> for the classic effect, or
// wrap with Layers<Black, PixelRelay<...>> to force a solid black background.
//
// v1.0.0

#ifndef STYLES_PIXEL_RELAY_H
#define STYLES_PIXEL_RELAY_H

// Usage: PixelRelay<COLOR_A, COUNT_A, COLOR_B, COUNT_B>
//    or: PixelRelay<COLOR_A, COUNT_A, COLOR_B, COUNT_B, FLASH_PERIOD_MS>
// COLOR_A, COLOR_B: COLOR
// COUNT_A: int - number of flashes on pixel 0 before handing off to pixel 1
// COUNT_B: int - number of flashes on pixel 1 before handing back to pixel 0
// FLASH_PERIOD_MS: int - full on+off duration of a single flash, in ms
//                  (default 333 = ~3 Hz). Applied to both phases.
// Return value: LAYER
//
// Example (Luke ROTJ cave scene, 2-pixel arrow accent, recolorable via the
// preset editor's BASE_COLOR_ARG):
//   StylePtr<PixelRelay<
//     RgbArg<BASE_COLOR_ARG, Rgb<0,255,0>>, 9,
//     RgbArg<BASE_COLOR_ARG, Rgb<255,0,0>>, 5
//   >>()

template<class COLOR_A, int COUNT_A, class COLOR_B, int COUNT_B, int FLASH_PERIOD_MS = 333>
class PixelRelay {
public:
  static_assert(COUNT_A > 0, "PixelRelay COUNT_A must be greater than 0");
  static_assert(COUNT_B > 0, "PixelRelay COUNT_B must be greater than 0");
  static_assert(FLASH_PERIOD_MS > 0, "PixelRelay FLASH_PERIOD_MS must be greater than 0");

  LayerRunResult run(BladeBase* blade) {
    RunLayer(&a_, blade);
    RunLayer(&b_, blade);

    const uint32_t cycle    = (uint32_t)(COUNT_A + COUNT_B) * FLASH_PERIOD_MS;
    const uint32_t a_window = (uint32_t)COUNT_A * FLASH_PERIOD_MS;
    uint32_t pos = millis() % cycle;
    phase_a_ = pos < a_window;
    uint32_t local = phase_a_ ? pos : (pos - a_window);
    on_ = (local % FLASH_PERIOD_MS) < (FLASH_PERIOD_MS / 2);

    return LayerRunResult::UNKNOWN;
  }

private:
  PONUA COLOR_A a_;
  PONUA COLOR_B b_;
  bool phase_a_ = true;
  bool on_ = false;

public:
  auto getColor(int led) -> decltype(a_.getColor(led) * 1) {
    decltype(a_.getColor(led) * 1) ret = RGBA_um_nod::Transparent();
    if (on_) {
      if (phase_a_ && led == 0) ret = a_.getColor(led) * 32768;
      else if (!phase_a_ && led == 1) ret = b_.getColor(led) * 32768;
    }
    return ret;
  }
};

#endif  // STYLES_PIXEL_RELAY_H
