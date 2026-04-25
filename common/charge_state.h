// JMT Charge Detect Support
// This header declares a shared global flag used by JMT charge detection logic
// to indicate when a charging session has reached a fully charged state.
// It allows different parts of ProffieOS (styles, props, and logic handlers)
// to reference a consistent “charge complete” condition during runtime.
#ifndef CHARGE_STATE_H
#define CHARGE_STATE_H

// Global flag for "charging session is fully charged".
extern bool g_charge_full;

#endif
