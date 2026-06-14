# FORMATIONS-REFERENCE.md
# Juicebox Football — Canonical Formation Coordinate Reference
# 
# PURPOSE: This file defines EXACT player positions for every offensive formation.
# Claude Code should read this file and use these coordinates verbatim when
# creating or editing formations. DO NOT guess player positions.
#
# COORDINATE SYSTEM:
# - The field is rendered as an SVG with a viewBox that represents a section of a football field
# - X axis: 0 = left sideline, 100 = right sideline, 50 = center of field
# - Y axis: 0 = top of card (deep), 100 = bottom of card (behind LOS)
# - The line of scrimmage (LOS) is at approximately Y = 55-60
# - Players ON the LOS are at Y ≈ 58
# - Players 1 yard behind LOS are at Y ≈ 63
# - Players in the backfield (5-7 yards) are at Y ≈ 75-85
#
# PLAYER TYPES:
# - OL: Offensive linemen (always 5: LT, LG, C, RG, RT)
# - Q: Quarterback
# - RB/FB/HB: Running backs / Fullback / Halfback
# - X: Split end (typically weak side, on LOS)
# - Z: Flanker (typically strong side, off LOS by 1 yard)
# - Y: Tight end
# - H: H-back / slot / wing
#
# ALIGNMENT RULES (critical for accuracy):
# - OL splits: Guards are ~3 feet from Center, Tackles are ~3 feet from Guards
#   In coordinate terms: C=50, LG=45, RG=55, LT=40, RT=60
# - Receivers "on the LOS" means Y ≈ 58 (same as OL)
# - Receivers "off the LOS" means Y ≈ 61 (1 yard behind OL)
# - Only 7 players can be on the LOS at snap. The other 4 must be off.
# - Wide receiver splits: outside receivers at X ≈ 8-12 (left) or 88-92 (right)
# - Slot receivers: X ≈ 22-28 (left slot) or 72-78 (right slot)
# - Tight ends: attached to tackle at X ≈ 35 (left) or 65 (right)
# - Wing: 1 yard behind and 1 yard outside the TE, X ≈ 32 or 68, Y ≈ 62
# - Under center QB: Y ≈ 63, X = 50
# - Shotgun QB: Y ≈ 75, X = 50
# - Pistol QB: Y ≈ 70, X = 50
#
# FORMATION NAMING CONVENTION:
# - "Rt" or "Right" = strength/TE to the right
# - "Lt" or "Left" = strength/TE to the left
# - Personnel groupings: first digit = RBs, second = TEs
#   11 = 1 RB, 1 TE, 3 WR
#   12 = 1 RB, 2 TE, 2 WR
#   21 = 2 RB, 1 TE, 2 WR
#   10 = 1 RB, 0 TE, 4 WR
#   22 = 2 RB, 2 TE, 1 WR
#   13 = 1 RB, 3 TE, 1 WR
#   20 = 2 RB, 0 TE, 3 WR
#   00 = 0 RB, 0 TE, 5 WR (rarely used)
#
# ==========================================================================

## SHOTGUN FORMATIONS

### 2x2 Doubles Right (11 personnel)
# Two receivers each side, TE right, RB next to QB
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE attached right, ON LOS
X:   { x: 10, y: 58 }       # Split end left, ON LOS
Z:   { x: 90, y: 61 }       # Flanker right, OFF LOS
H:   { x: 25, y: 61 }       # Slot left, OFF LOS
Q:   { x: 50, y: 75 }       # Shotgun
RB:  { x: 56, y: 75 }       # RB to right of QB

### 2x2 Doubles Left (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 35, y: 58 }       # TE attached left, ON LOS
X:   { x: 90, y: 58 }       # Split end right, ON LOS
Z:   { x: 10, y: 61 }       # Flanker left, OFF LOS
H:   { x: 75, y: 61 }       # Slot right, OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### 3x1 Trips Right (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE attached right, ON LOS
X:   { x: 10, y: 58 }       # Split end left (solo side), ON LOS
Z:   { x: 90, y: 61 }       # Outside receiver right, OFF LOS
H:   { x: 75, y: 61 }       # Slot right, OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### 3x1 Trips Left (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 35, y: 58 }       # TE attached left, ON LOS
X:   { x: 90, y: 58 }       # Split end right (solo side), ON LOS
Z:   { x: 10, y: 61 }       # Outside receiver left, OFF LOS
H:   { x: 25, y: 61 }       # Slot left, OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 56, y: 75 }

### Empty 3x2 Right (10 personnel — no TE, 5 WR)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 10, y: 58 }       # X left, ON LOS
H:   { x: 25, y: 61 }       # Slot left, OFF LOS
Z:   { x: 90, y: 58 }       # Z right outside, ON LOS
W:   { x: 75, y: 61 }       # Slot right, OFF LOS
F:   { x: 65, y: 61 }       # Inside slot right, OFF LOS
Q:   { x: 50, y: 75 }       # Shotgun, alone in backfield

### Empty 2x3 Left (10 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 10, y: 58 }       # X left outside, ON LOS
H:   { x: 25, y: 61 }       # Left slot, OFF LOS
F:   { x: 35, y: 61 }       # Inside left slot, OFF LOS
Z:   { x: 90, y: 58 }       # Z right outside, ON LOS
W:   { x: 75, y: 61 }       # Right slot, OFF LOS
Q:   { x: 50, y: 75 }

### Bunch Right (11 personnel)
# 3 receivers clustered tight to the right
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 10, y: 58 }       # X alone left, ON LOS
Z:   { x: 78, y: 58 }       # Point man (on LOS, outermost)
H:   { x: 74, y: 62 }       # Wing (behind and inside Z)
Y:   { x: 78, y: 65 }       # Tail (behind Z)
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### Bunch Left (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 90, y: 58 }       # X alone right, ON LOS
Z:   { x: 22, y: 58 }       # Point man left
H:   { x: 26, y: 62 }       # Wing
Y:   { x: 22, y: 65 }       # Tail
Q:   { x: 50, y: 75 }
RB:  { x: 56, y: 75 }

### Spread 2x2 Open (10 personnel — no TE, 4 WR)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 8, y: 58 }        # Wide left, ON LOS
H:   { x: 25, y: 61 }       # Slot left, OFF LOS
Z:   { x: 92, y: 61 }       # Wide right, OFF LOS
W:   { x: 75, y: 58 }       # Slot right, ON LOS
Q:   { x: 50, y: 75 }
RB:  { x: 56, y: 75 }

### Trey Right / 3x1 Tight (12 personnel)
# TE attached, extra TE/H in slot — run-heavy trips look
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE attached right, ON LOS
H:   { x: 72, y: 61 }       # H-back/second TE in slot, OFF LOS
X:   { x: 10, y: 58 }       # X alone left, ON LOS
Z:   { x: 88, y: 61 }       # Z outside right, OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### Twins Right (11 personnel — no slot, 2 WRs same side)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right, ON LOS
X:   { x: 10, y: 58 }       # X left, ON LOS
Z:   { x: 90, y: 61 }       # Z outside right, OFF LOS
H:   { x: 82, y: 61 }       # H slot right (tight split), OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### Quads Right (10 personnel — 4 receivers to one side)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 10, y: 58 }       # X alone left, ON LOS
Z:   { x: 90, y: 58 }       # Z outermost right, ON LOS
W:   { x: 82, y: 61 }       # #2 right, OFF LOS
H:   { x: 74, y: 61 }       # #3 right, OFF LOS
F:   { x: 66, y: 61 }       # #4 right (near OT), OFF LOS
Q:   { x: 50, y: 75 }

## PISTOL FORMATIONS

### Pistol 2x2 (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right
X:   { x: 10, y: 58 }       # X left
Z:   { x: 90, y: 61 }       # Z right
H:   { x: 25, y: 61 }       # Slot left
Q:   { x: 50, y: 70 }       # Pistol depth (4 yards)
RB:  { x: 50, y: 80 }       # RB directly behind QB

### Pistol 3x1 Right (11 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
H:   { x: 75, y: 61 }
Q:   { x: 50, y: 70 }
RB:  { x: 50, y: 80 }

### Pistol Wing Right (12 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE attached right
H:   { x: 68, y: 62 }       # Wing — behind and outside TE
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
Q:   { x: 50, y: 70 }
RB:  { x: 50, y: 80 }

## UNDER CENTER FORMATIONS

### I-Formation Right (21 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right
X:   { x: 10, y: 58 }       # X left
Z:   { x: 90, y: 61 }       # Z right
Q:   { x: 50, y: 63 }       # Under center
FB:  { x: 50, y: 72 }       # Fullback
RB:  { x: 50, y: 80 }       # Tailback — deep I

### I-Formation Strong Right (21 personnel)
# Same as I but with Z closer to formation
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 82, y: 61 }       # Flanker in tighter split
Q:   { x: 50, y: 63 }
FB:  { x: 50, y: 72 }
RB:  { x: 50, y: 80 }

### Pro Set / Split Backs Right (21 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
Q:   { x: 50, y: 63 }
RB:  { x: 44, y: 73 }       # Left halfback
FB:  { x: 56, y: 73 }       # Right halfback (side by side)

### Ace Right (11 personnel, under center)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
H:   { x: 25, y: 61 }       # Slot left
Q:   { x: 50, y: 63 }
RB:  { x: 50, y: 75 }       # Single back

### Wing Right (12 personnel, under center)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right, ON LOS
H:   { x: 68, y: 62 }       # Wing — 1yd behind, 1yd outside TE
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
Q:   { x: 50, y: 63 }
RB:  { x: 50, y: 75 }

### Wing Left (12 personnel, under center)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 35, y: 58 }       # TE left
H:   { x: 32, y: 62 }       # Wing left
X:   { x: 90, y: 58 }
Z:   { x: 10, y: 61 }
Q:   { x: 50, y: 63 }
RB:  { x: 50, y: 75 }

### Wing-T Right (22 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right
H:   { x: 68, y: 62 }       # Wingback
X:   { x: 10, y: 58 }       # SE left
Q:   { x: 50, y: 63 }       # Under center
FB:  { x: 50, y: 73 }       # FB offset slightly
RB:  { x: 44, y: 73 }       # HB behind LG area

### Unbalanced Right (12 personnel)
# Extra OL/TE to the right — LT reports as eligible or TE shifts over
LT:  { x: 42, y: 58 }       # Shifted slightly right
LG:  { x: 47, y: 58 }
C:   { x: 52, y: 58 }       # Center shifted right
RG:  { x: 57, y: 58 }
RT:  { x: 62, y: 58 }
Y:   { x: 67, y: 58 }       # TE right of RT
H:   { x: 72, y: 58 }       # Extra blocker / tackle-eligible, ON LOS
X:   { x: 8, y: 58 }        # X alone left
Z:   { x: 90, y: 61 }
Q:   { x: 52, y: 75 }
RB:  { x: 46, y: 75 }

### Jumbo / Goal Line (13 or 22 personnel)
LT:  { x: 38, y: 58 }       # Tighter OL splits
LG:  { x: 43, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 57, y: 58 }
RT:  { x: 62, y: 58 }
Y:   { x: 67, y: 58 }       # TE right
TE2: { x: 33, y: 58 }       # Second TE left
Q:   { x: 50, y: 63 }       # Under center
FB:  { x: 50, y: 70 }
RB:  { x: 50, y: 78 }
Z:   { x: 85, y: 61 }       # Only WR, flexed out right

### Heavy / Jumbo 2 TE 2 RB (22 personnel)
LT:  { x: 38, y: 58 }
LG:  { x: 44, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 56, y: 58 }
RT:  { x: 62, y: 58 }
Y:   { x: 67, y: 58 }       # TE right
TE2: { x: 33, y: 58 }       # TE left
X:   { x: 10, y: 58 }       # WR left
Q:   { x: 50, y: 63 }
FB:  { x: 50, y: 72 }
RB:  { x: 50, y: 80 }

### Singleback Doubles Right (11 personnel, under center)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
H:   { x: 25, y: 61 }
Q:   { x: 50, y: 63 }
RB:  { x: 50, y: 75 }

## SPECIAL / EXOTIC FORMATIONS

### Stack Right (11 personnel)
# Two receivers stacked vertically on the right
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 85, y: 58 }       # Front receiver, ON LOS
H:   { x: 85, y: 63 }       # Behind Z, stacked, OFF LOS
Q:   { x: 50, y: 75 }
RB:  { x: 44, y: 75 }

### Tight Doubles Right (12 personnel — 2 TE, compressed)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right
TE2: { x: 35, y: 58 }       # TE left
X:   { x: 10, y: 58 }       # WR left
Z:   { x: 90, y: 61 }       # WR right
Q:   { x: 50, y: 75 }
RB:  { x: 56, y: 75 }

### Nub Right (12 personnel — TE with no WR to his side)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }       # TE right — nobody outside him
H:   { x: 35, y: 58 }       # Second TE/H left
X:   { x: 10, y: 58 }
Z:   { x: 22, y: 61 }       # Slot left — all receivers to the left
Q:   { x: 50, y: 75 }
RB:  { x: 56, y: 75 }

### Flexbone / Triple Option (20 personnel)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
X:   { x: 10, y: 58 }       # SE left
Z:   { x: 90, y: 58 }       # SE right
Q:   { x: 50, y: 63 }       # Under center
FB:  { x: 50, y: 72 }       # FB directly behind QB
A:   { x: 38, y: 62 }       # A-back left (slot/wing)
B:   { x: 62, y: 62 }       # A-back right (slot/wing)

### Wildcat (21 personnel — direct snap to RB)
LT:  { x: 40, y: 58 }
LG:  { x: 45, y: 58 }
C:   { x: 50, y: 58 }
RG:  { x: 55, y: 58 }
RT:  { x: 60, y: 58 }
Y:   { x: 65, y: 58 }
X:   { x: 10, y: 58 }
Z:   { x: 90, y: 61 }
RB:  { x: 50, y: 65 }       # Direct snap recipient — behind center
Q:   { x: 38, y: 62 }       # QB moved to wing/slot position
FB:  { x: 50, y: 75 }

# ==========================================================================
# DEFENSIVE FRONTS
# ==========================================================================
#
# Defensive player positions are relative to the OFFENSE.
# Y axis for defense: lower Y = closer to LOS
# Defense faces UP (toward top of card/deep)
#
# DL on LOS: Y ≈ 55 (just above offensive LOS at 58)
# LBs: Y ≈ 48-50 (3-5 yards off LOS)
# Safeties: Y ≈ 28-35 (10-12 yards off LOS)
# Corners: Y ≈ 42-50, X aligned with receivers
#
# TECHNIQUE NUMBERS (for reference):
# 0 = head up on Center
# 1 = inside shoulder of Guard
# 2i = inside shoulder of Guard (tighter)
# 2 = head up on Guard
# 3 = outside shoulder of Guard
# 4i = inside shoulder of Tackle
# 4 = head up on Tackle
# 5 = outside shoulder of Tackle
# 6 = inside shoulder of TE
# 7 = head up on TE
# 9 = outside shoulder of TE

### 4-3 Over
E:   { x: 35, y: 55 }       # DE weak side — 5 tech
T:   { x: 47, y: 55 }       # DT — 3 tech (strong side of center)
N:   { x: 52, y: 55 }       # Nose — 1 tech (weak shade of center)
E:   { x: 65, y: 55 }       # DE strong side — 5/6 tech to TE
W:   { x: 38, y: 48 }       # Will — weak side LB
M:   { x: 50, y: 48 }       # Mike — middle LB
$:   { x: 60, y: 48 }       # Sam/$ — strong side LB
C:   { x: 10, y: 45 }       # CB left
C:   { x: 90, y: 45 }       # CB right
FS:  { x: 60, y: 30 }       # Free safety
BS:  { x: 40, y: 30 }       # Boundary safety

### 4-3 Under
E:   { x: 65, y: 55 }       # Strong DE — 9 tech (outside TE)
T:   { x: 55, y: 55 }       # 3 tech — outside shade of Guard
N:   { x: 48, y: 55 }       # Nose — shade of Center
E:   { x: 38, y: 55 }       # Weak DE — 5 tech
W:   { x: 35, y: 48 }       # Will
M:   { x: 50, y: 48 }       # Mike
$:   { x: 62, y: 48 }       # Sam/$
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 60, y: 30 }
BS:  { x: 40, y: 30 }

### Tite Front (3-down look, 2 high shell)
E:   { x: 38, y: 55 }       # Weak end — 4i
N:   { x: 50, y: 55 }       # Nose — 0 tech (head up on C)
E:   { x: 62, y: 55 }       # Strong end — 4i 
W:   { x: 33, y: 48 }       # Will — apex weak
M:   { x: 50, y: 48 }       # Mike — stacked behind Nose
$:   { x: 67, y: 48 }       # Sam/$ — apex strong
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 60, y: 30 }
BS:  { x: 40, y: 30 }

### Odd / 3-4 Base
E:   { x: 63, y: 55 }       # Strong DE — 5 tech
N:   { x: 50, y: 55 }       # Nose — 0 tech
E:   { x: 37, y: 55 }       # Weak DE — 5 tech
$:   { x: 68, y: 52 }       # OLB strong — edge
W:   { x: 32, y: 52 }       # OLB weak — edge
M:   { x: 50, y: 48 }       # ILB Mike
M:   { x: 55, y: 48 }       # ILB Will (or second Mike)
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 55, y: 30 }
BS:  { x: 40, y: 30 }

### Bear Front (6 on LOS)
E:   { x: 35, y: 55 }       # DE wide
T:   { x: 43, y: 55 }       # DT — 2i on Guard
N:   { x: 50, y: 55 }       # Nose — 0 on Center
T:   { x: 57, y: 55 }       # DT — 2i on Guard
E:   { x: 65, y: 55 }       # DE strong
$:   { x: 70, y: 52 }       # OLB edge
M:   { x: 50, y: 46 }       # Mike (only off-ball LB)
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 55, y: 30 }
BS:  { x: 40, y: 30 }

### Nickel / 4-2-5
E:   { x: 35, y: 55 }
T:   { x: 47, y: 55 }
N:   { x: 53, y: 55 }
E:   { x: 65, y: 55 }
M:   { x: 50, y: 48 }       # Mike
W:   { x: 40, y: 48 }       # Will
NB:  { x: 25, y: 48 }       # Nickel back — slot defender
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 55, y: 30 }
BS:  { x: 40, y: 30 }

### Dime / 4-1-6
E:   { x: 35, y: 55 }
T:   { x: 47, y: 55 }
N:   { x: 53, y: 55 }
E:   { x: 65, y: 55 }
M:   { x: 50, y: 48 }       # Solo LB
NB:  { x: 25, y: 48 }       # Nickel
DB:  { x: 75, y: 48 }       # Dime
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
FS:  { x: 55, y: 30 }
BS:  { x: 40, y: 30 }

### 6-1 Goal Line
E:   { x: 33, y: 55 }
T:   { x: 40, y: 55 }
T:   { x: 47, y: 55 }
N:   { x: 53, y: 55 }
T:   { x: 60, y: 55 }
E:   { x: 67, y: 55 }
M:   { x: 50, y: 50 }       # Solo LB
C:   { x: 15, y: 48 }
C:   { x: 85, y: 48 }
FS:  { x: 50, y: 38 }
BS:  { x: 35, y: 38 }

### Split / 5-0-5 (Quarters shell — used by some HS programs)
E:   { x: 35, y: 55 }       # 5 tech
T:   { x: 45, y: 55 }       # 3 tech
N:   { x: 50, y: 55 }       # 0 tech Nose
T:   { x: 55, y: 55 }       # 3 tech
E:   { x: 65, y: 55 }       # 5 tech
M:   { x: 50, y: 46 }       # Solo Mike
C:   { x: 10, y: 45 }
C:   { x: 90, y: 45 }
NB:  { x: 25, y: 44 }       # Nickel / OLB replacement
FS:  { x: 60, y: 30 }
BS:  { x: 40, y: 30 }

# ==========================================================================
# NOTES FOR CLAUDE CODE
# ==========================================================================
#
# 1. ALWAYS reference this file when creating or modifying formations.
#    Do NOT estimate player positions from memory.
#
# 2. When mirroring a formation (flipping left/right), the formula is:
#    new_x = 100 - old_x
#    Y values stay the same.
#
# 3. The 7-on-the-line rule: Count it. If you have more than 7 players
#    at Y ≈ 58, the formation is illegal. Only 7 can be on the LOS.
#    The two end-most players on the LOS are eligible.
#
# 4. Player label positioning: Labels go INSIDE the player circle.
#    For offensive skill players (WR, RB, TE), use colored circles.
#    For OL, use open circles or squares (Center = square).
#
# 5. When the user requests a formation not in this file, use the
#    closest matching formation as a base and adjust. Document
#    which base formation you used and what you changed.
#
# 6. Personnel grouping determines how many of each position type:
#    If "12 personnel" is requested but formation isn't specified,
#    default to Wing Right (12).
#    If "10 personnel" is requested, default to Spread 2x2 Open.
#    If "11 personnel" is requested, default to 2x2 Doubles Right.
#    If "21 personnel" is requested, default to I-Formation Right.
#    If "22 personnel" is requested, default to Heavy 2TE 2RB.
#
# 7. OL splits should ALWAYS be consistent:
#    Center at x=50, Guards at ±5, Tackles at ±10
#    Exception: Jumbo/Goal Line uses tighter splits (±4 to ±7)
#    Exception: Unbalanced shifts everything ~2 units right or left
