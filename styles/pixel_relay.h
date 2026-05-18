// JMT PixelRelay Style
//
// Alternating "relay race" accent effect: COLOR_A flashes COUNT_A times, then
// COLOR_B flashes COUNT_B times. The cycle repeats. Both colors share a single
// flash heartbeat (FLASH_PERIOD_MS) so the off color is simply dark while it
// is not its turn.
//
// Supports two hardware shapes via SAME_PIXEL:
//   SAME_PIXEL = 0  (default): two-pixel mode. COLOR_A flashes on pixel 0,
//                              COLOR_B flashes on pixel 1.
//   SAME_PIXEL = 1:            one-pixel mode. Both colors flash on pixel 0,
//                              alternating in time. Useful for single-LED
//                              accents or parallel-wired pairs.
//
// Designed for the Luke ROTJ cave-scene arrow accent on a 2-LED accent strip,
// but works as a general-purpose alternating flasher on 1- or 2-pixel accents.
//
// Provided in two forms (matching the stock ProffieOS LocalizedClash pattern):
//   PixelRelayL  - layer form, returns RGBA_um_nod (transparent for off pixels).
//                  Compose it inside Layers<some_base_color, PixelRelayL<...>>
//                  when you want a base color to show through off pixels.
//   PixelRelay   - top-level form, pre-wrapped as Layers<Black, PixelRelayL<...>>.
//                  Drops directly into StylePtr<>, off pixels render solid black.
//
// v1.0.2

#ifndef STYLES_PIXEL_RELAY_H
#define STYLES_PIXEL_RELAY_H

// Usage: PixelRelay<COLOR_A, COUNT_A, COLOR_B, COUNT_B>
//    or: PixelRelay<COLOR_A, COUNT_A, COLOR_B, COUNT_B, FLASH_PERIOD_MS>
//    or: PixelRelay<COLOR_A, COUNT_A, COLOR_B, COUNT_B, FLASH_PERIOD_MS, SAME_PIXEL>
//
// COLOR_A, COLOR_B: COLOR
// COUNT_A: int - number of flashes for COLOR_A before handing off to COLOR_B
// COUNT_B: int - number of flashes for COLOR_B before handing back to COLOR_A
// FLASH_PERIOD_MS: int - full on+off duration of a single flash, in ms.
//                  Pass 0 (or omit) to use the 333 ms default (~3 Hz).
// SAME_PIXEL: int - 0 (default) for two-pixel mode, 1 for one-pixel mode.
// Return value: COLOR (for PixelRelay) or LAYER (for PixelRelayL)
//
// Examples:
//
// Two-pixel Luke ROTJ cave scene (recolorable via the preset editor):
//   StylePtr<PixelRelay<
//     RgbArg<BASE_COLOR_ARG, Rgb<0,255,0>>, 9,
//     RgbArg<BASE_COLOR_ARG, Rgb<255,0,0>>, 5
//   >>()
//
// Same effect on a single LED or parallel-wired pair (one-pixel mode,
// default 333 ms flash period -- pass 0 for FLASH_PERIOD_MS to keep the default):
//   StylePtr<PixelRelay<
//     RgbArg<BASE_COLOR_ARG, Rgb<0,255,0>>, 9,
//     RgbArg<BASE_COLOR_ARG, Rgb<255,0,0>>, 5,
//     0,  // FLASH_PERIOD_MS = 0 means use default 333 ms
//     1   // SAME_PIXEL = 1 enables one-pixel mode
//   >>()

template<class COLOR_A, int COUNT_A,
         class COLOR_B, int COUNT_B,
         int FLASH_PERIOD_MS = 333,
         int SAME_PIXEL = 0>
class PixelRelayL {
public:
  static_assert(COUNT_A > 0, "PixelRelayL COUNT_A must be greater than 0");
  static_assert(COUNT_B > 0, "PixelRelayL COUNT_B must be greater than 0");
  static_assert(FLASH_PERIOD_MS >= 0,
                "PixelRelayL FLASH_PERIOD_MS must be 0 (default 333ms) or positive");
  static_assert(SAME_PIXEL == 0 || SAME_PIXEL == 1,
                "PixelRelayL SAME_PIXEL must be 0 (two-pixel) or 1 (one-pixel)");

  static constexpr int PERIOD_MS = (FLASH_PERIOD_MS == 0) ? 333 : FLASH_PERIOD_MS;

  LayerRunResult run(BladeBase* blade) {
    RunLayer(&a_, blade);
    RunLayer(&b_, blade);

    const uint32_t cycle    = (uint32_t)(COUNT_A + COUNT_B) * PERIOD_MS;
    const uint32_t a_window = (uint32_t)COUNT_A * PERIOD_MS;
    uint32_t pos = millis() % cycle;
    phase_a_ = pos < a_window;
    uint32_t local = phase_a_ ? pos : (pos - a_window);
    on_ = (local % PERIOD_MS) < (PERIOD_MS / 2);

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
      if (SAME_PIXEL == 1) {
        if (led == 0) {
          if (phase_a_) ret = a_.getColor(led) * 32768;
          else ret = b_.getColor(led) * 32768;
        }
      } else {
        if (phase_a_ && led == 0) ret = a_.getColor(led) * 32768;
        else if (!phase_a_ && led == 1) ret = b_.getColor(led) * 32768;
      }
    }
    return ret;
  }
};

template<class COLOR_A, int COUNT_A,
         class COLOR_B, int COUNT_B,
         int FLASH_PERIOD_MS = 333,
         int SAME_PIXEL = 0>
using PixelRelay = Layers<Black,
  PixelRelayL<COLOR_A, COUNT_A, COLOR_B, COUNT_B, FLASH_PERIOD_MS, SAME_PIXEL>>;

#endif  // STYLES_PIXEL_RELAY_H
