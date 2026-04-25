# jmt-proffie-addons

Optional ProffieOS extensions used by JMT Studio. Non-destructive, drop-in files that enhance functionality without modifying core firmware.

## Overview

This repository contains a collection of custom props, wrappers, and helper utilities designed to extend ProffieOS behavior in a clean and maintainable way.

All files are intended to be placed into a standard ProffieOS directory structure (such as `props/`, `functions/`, or `common/`) and are only active when explicitly included in a configuration.

## Design Principles

- **Non-destructive**  
  These extensions do not modify any existing ProffieOS source files.

- **Optional**  
  Nothing is active unless explicitly included in a config.

- **Composable**  
  Designed to work alongside existing props and styles without conflicts.

- **Portable**  
  Compatible with user-supplied ProffieOS versions.

## Installation

Files should be placed into their respective ProffieOS directories:

- `props/`
- `functions/`
- `common/`

JMT Studio can install and manage these automatically, or they can be added manually.

## Usage

These extensions are intended to be used within standard ProffieOS configs, for example:

```cpp
#include "props/jmt_fett263_wrapper.h"
