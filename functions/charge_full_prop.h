// JMT Charge Full Style Function
// This function exposes the global g_charge_full flag to blade styles as a
// SingleValue input, returning 32768 when the battery is fully charged and 0 otherwise.
// It allows styles to react dynamically to a “charge complete” state, such as
// triggering visual indicators or transitions based on charge status.
// v1.0.0
#ifndef FUNCTIONS_CHARGE_FULL_PROP_H
#define FUNCTIONS_CHARGE_FULL_PROP_H

#include "svf.h"
#include "../common/charge_state.h"

// Style function: 0 when not full, 32768 when full.
// Just wraps the global g_charge_full set by MyFettProp.
class ChargeFullPropSVF {
public:
  void run(BladeBase* blade) {}

  int calculate(BladeBase* blade) {
    return g_charge_full ? 32768 : 0;
  }

  int getInteger(int led) {
    return calculate(nullptr);
  }
};

using ChargeFullPropF = SingleValueAdapter<ChargeFullPropSVF>;

#endif
