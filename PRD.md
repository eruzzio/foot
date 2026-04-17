# PRD — Orion Sports Analysis Platform

**Version:** 1.0
**Date:** March 2026
**Status:** In Development

---

## Executive Summary

**Orion** is a real-time sports match coding and analysis platform designed for coaches, analysts, and technical staff. It enables users to record match events using customizable button panels, manage team rosters, visualize live statistics, and export comprehensive match reports.

The platform prioritizes speed, accuracy, and actionable insights, allowing teams to:
- Code live matches in real-time with zero lag
- Customize event tracking to their specific needs
- Analyze performance through intuitive dashboards
- Build institutional knowledge via exportable reports

---

## Product Vision

Create the most intuitive, responsive sports analysis tool that becomes indispensable for tactical preparation and performance review at all competitive levels.

### Core Values
- **Speed:** Instant event recording, no delays or friction
- **Flexibility:** Fully customizable to any sport or analysis methodology
- **Insights:** Transform raw data into actionable performance metrics
- **Reliability:** Secure data storage with offline resilience
- **Team-First:** Support collaborative analysis across multiple users

---

## Target Users

| User Persona | Role | Key Needs |
|---|---|---|
| **Head Coach** | Strategic decision-maker | Tactical summaries, team patterns, export reports |
| **Analyst/Scout** | Detail-oriented recorder | Event accuracy, custom coding schemes, real-time stats |
| **Strength Coach** | Performance focus | Player-level stats, workload metrics, export for external tools |
| **Assistant Coach** | Support role | Team management, player roster, match history |

---

## Market Context

### Pain Points Addressed
- Manual spreadsheet-based match analysis is slow and error-prone
- Existing solutions are expensive and lack customization
- Limited offline capability and data export options
- Difficulty tracking multiple events simultaneously across teams

### Competitive Advantage
- **Affordable:** No expensive licensing or infrastructure costs
- **Flexible:** Custom button layouts, event types, and formations
- **Accessible:** Works on any modern browser, optimized for tablets
- **Integrated:** Team management, player stats, and video integration in one platform

---

## Core Features

### 1. Live Match Coding (`CodingInterface`)

#### 1.1 Match Setup
- **Match Details Form**
  - Team A and Team B names (required)
  - Championship / Tournament name
  - Matchday / Round number
  - Venue / Location
  - Match date and time
  - Panel selection for coding scheme

- **State Management**
  - Setup → In Progress → Paused → Completed
  - Real-time score tracking (manual increment/decrement per team)
  - Match duration recording (MM:SS format)

#### 1.2 Event Recording
- **Button-Based Input**
  - One-click event recording with automatic timestamp
  - Optional outcome selection (Success/Failure) for events with binary results
  - Neutral outcome option for descriptive events
  - Real-time synchronization to database

- **Event Timeline**
  - Reverse-chronological display (newest first)
  - Timestamp, event type, team, result indicator
  - One-click deletion with confirmation
  - Scrollable view with max height constraint

#### 1.3 Dynamic Statistics Dashboard
- **Real-Time Metrics**
  - Total events per team
  - Event type distribution with comparative bar charts
  - Success rate percentage per team
  - Time-based distribution (0-15min, 15-30min, 30-45min, 45+min)
  - Key indicators: Most active team, Peak period, Dominant action

- **Live Updates**
  - Updates automatically on each event recording
  - Zero latency through Supabase Realtime subscriptions

#### 1.4 Panel Management During Match
- **Panel Switching**
  - Dropdown selector with all user panels
  - Default panel pre-selected
  - Seamless mid-match panel switching
  - Button state preservation across panels

#### 1.5 Formation Display
- **Match Formations**
  - Modal interface for tactical setup per team
  - Two scenarios:
    - No formation → Create new or copy team's active formation
    - Existing formation → Field visualization with player assignments
  - Real-time formation updates

#### 1.6 Export from Live Match
- **Formats Supported**
  - Excel (.xlsx): Structured workbook with multiple sheets
  - CSV (.csv): Raw event data with headers
- **Data Included**
  - All match events with timestamps
  - Aggregate statistics
  - Team compositions
  - Match metadata

---

### 2. Panel Customization (`PanelsManager`)

#### 2.1 Panel Management
- **Create/Edit/Delete**
  - Panel name and optional description
  - Non-destructive editing
  - Delete with confirmation

- **Default Panel**
  - Auto-created on first login
  - Contains 8 standard football actions: Shot, Pass, Dribble, Turnover, Recovery, Interception, Foul, Tackle
  - Info banner indicating read-only status

#### 2.2 Button Properties
Users can create and modify buttons with the following properties:

| Property | Type | Purpose | Editable |
|---|---|---|---|
| Label | Text | Display name (max 50 chars) | Yes |
| Color | Hex | Visual identification | Yes |
| Event Type | Select | Link to event type definition | Yes |
| Button Type | Select | `event` (creates entry) or `keyword` (qualifies last event) | No* |
| Tab Page | Select | Page 1, 2, or 3 for organization | No* |
| Keyboard Shortcut | Single char | Quick key trigger (e.g., "S" for Shot) | Yes |
| Group Name | Text | Category for visual grouping | Yes |
| Team Association | Select | Team A / Team B / Both | Yes |
| Sub-Buttons | Hierarchy | Keywords linked to parent event button | No* |

*Cannot be changed after creation; requires delete + recreate

#### 2.3 Button Organization
- **Grid Layout**
  - Default 2-4 column responsive grid
  - Position auto-calculated on creation
  - Visual color indicator per button
  - Hover actions: Add sub-button, Expand, Edit, Delete

- **Sub-Buttons (Keywords)**
  - Only `event` type buttons can have sub-buttons
  - Sub-buttons are automatically `keyword` type
  - Collapsible hierarchy display
  - Inherited tab page from parent

#### 2.4 Free Layout Editor (`FreeLayoutEditor`)
- **Canvas Interaction**
  - Drag-to-reposition buttons (grid-snapped to 20px)
  - Resize via bottom-right corner handle
  - Min size: 80px × 40px
  - Visual selection ring (blue outline)
  - Auto-save to database on change

- **Controls**
  - Reset all positions button with confirmation
  - Toggle between grid and free layout modes
  - Duplicate button action

---

### 3. Team Management (`MyTeam`)

#### 3.1 Team Settings (`TeamSettings`)
- **Basic Info**
  - Team name (required)
  - Category: U13, U15, U17, U19, Senior, Other
  - Description / Notes field

- **Visual Identity**
  - Logo upload (file or URL) with 5MB limit
  - Live preview
  - Supported formats: JPEG, PNG, GIF, WebP
  - Stored in Supabase `team-logos` bucket

#### 3.2 Player Roster (`PlayerForm`)
- **Player Properties**
  - First name (required)
  - Last name (required)
  - Jersey number (1-99)
  - Position: Goalkeeper, Defender, Midfielder, Attacker
  - Photo (file upload or URL)

- **Photo Management**
  - Circular preview (120×120px)
  - 5MB file limit, 5MP resolution max
  - Auto-compression on upload
  - Stored in `player-photos` bucket

- **Player Actions**
  - Add new player
  - Edit existing player
  - Delete with confirmation
  - Active/inactive status indicator (green dot if in active formation)

#### 3.3 Tactical Formations (`FieldVisualization`)
- **Available Formations (7 presets)**
  1. 4-4-2 (balanced)
  2. 4-3-3 (attacking)
  3. 3-5-2 (wing-based)
  4. 5-3-2 (defensive)
  5. 3-4-3 (compact)
  6. 4-2-3-1 (midfield control)
  7. 4-5-1 (tight formation)

- **Formation Interface**
  - Visual field representation with position markers
  - Click position to assign/unassign player
  - Drag-to-swap players between positions
  - Live preview with player photos/numbers
  - Save formation with auto-generation of match associations

---

### 4. Statistics & Reports (`MyStats` / `MatchReport`)

#### 4.1 Match History
- **List View**
  - Card-based display of completed matches
  - Shows: Team names, final score, date
  - Visible only after minimum 1 completed match
  - Sortable by date (newest first)
  - Link to detailed match report

#### 4.2 Match Report
- **Header Section**
  - Team A vs Team B
  - Final score
  - Match duration
  - Date and venue

- **Summary Cards**
  - Total events count per team
  - Success rate percentage
  - Most active period
  - Dominant action type

- **Detailed Analytics**
  - Full Statistics component (identical to live view)
  - Complete event timeline
  - Export buttons (Excel, CSV)

---

## User Flows

### Flow 1: First-Time User Setup
1. Sign up with email/password
2. Confirm account
3. Auto-created default panel with 8 events
4. Redirect to team setup screen
5. Enter team name and (optional) logo
6. Add first players to roster
7. Select formation
8. Guided tour → Ready for first match

### Flow 2: Live Match Coding
1. User lands on CodingInterface
2. Clicks "New Match" → Match details modal
3. Enters match info and selects panel
4. Match enters "Setup" → "In Progress"
5. Timer starts, user clicks buttons to record events
6. Real-time stats update below
7. At match end: Confirm → Match marked "Completed"
8. Option to export report immediately

### Flow 3: Panel Customization
1. User navigates to "Mon Panneau"
2. Selects existing panel or creates new one
3. For each button:
   - Click edit or create new
   - Set label, color, event type, shortcuts
   - Save
4. Can drag-drop to reposition (if free layout enabled)
5. Changes sync instantly to database

### Flow 4: Viewing Match Statistics
1. User clicks "Mes Stats"
2. Selects completed match from list
3. Views full MatchReport with stats
4. Can filter/export data

---

## Technical Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Vite** for build optimization

### Backend Infrastructure
- **Supabase** (PostgreSQL)
  - Authentication (Email/Password)
  - Real-time subscriptions (match_events)
  - Row-Level Security (RLS) policies
  - File storage (team-logos, player-photos)

### Key Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `users` (auth) | Authentication | email, password |
| `teams` | Team info | name, logo_url, category, description |
| `players` | Team roster | first_name, last_name, jersey_number, position, photo_url |
| `matches` | Match records | team_a_name, team_b_name, score_a, score_b, status, match_time |
| `event_types` | Event taxonomy | name, category, icon, color, has_outcome |
| `match_events` | Individual events | match_id, event_type_id, team, timestamp, outcome |
| `panels` | Button layouts | name, description, use_free_layout, is_default |
| `panel_buttons` | Buttons per panel | label, color, event_type_id, position, layout_* |
| `team_formations` | Tactical setups | name, formation_type, team_id |
| `formation_positions` | Player assignments | formation_id, position_index, player_id |
| `match_formations` | Formation ↔ Match | match_id, team_id, formation_id |

### Security Model
- All data isolated by `user_id` via RLS
- System event types (pre-loaded) have `user_id = NULL`
- Public read access to system events
- Private write access to user data

---

## User Experience Goals

### Performance
- Event recording: **< 100ms** end-to-end
- Panel switching: **< 50ms**
- Statistics refresh: **< 200ms**
- Page load: **< 1.5s**

### Accessibility
- Keyboard shortcuts for all buttons (single character)
- High contrast color palette (WCAG AA minimum)
- Mobile responsive (320px to 4K)
- Tablet-optimized interface (10-inch standard)

### Reliability
- Auto-save all changes (no manual save button)
- Graceful offline handling (queue events, sync on reconnect)
- Undo capability (recent events deletable for 60 seconds)
- Data export as backup/archive

---

## Roadmap

### Phase 1 (Current - MVP)
✅ Live match coding interface
✅ Customizable button panels
✅ Team and player management
✅ Real-time statistics
✅ Match export (Excel, CSV)
✅ Button property editing

### Phase 2 (Q2 2026)
- Video integration (Vimeo/YouTube embed)
- Multi-user live collaboration (spectator mode)
- Advanced filtering and search in reports
- Custom event type templates
- Mobile app (React Native)

### Phase 3 (Q3 2026)
- AI-powered pattern detection
- Predictive analytics (trends, anomalies)
- API for third-party integrations
- White-label / reseller program
- Offline mode with sync

### Phase 4 (Q4 2026)
- League-wide dashboards
- Multi-match comparative analysis
- Video auto-segmentation by event
- Tournament brackets and scheduling
- Player development tracking

---

## Success Metrics

### User Adoption
- Target: 500 active users in Year 1
- Retention: 60% MAU → DAU conversion
- Avg. matches coded per user: 25/season

### Product Quality
- System uptime: 99.9%
- Event recording latency: < 150ms (p95)
- Export success rate: 99.5%
- User satisfaction (NPS): > 50

### Business
- Premium tier adoption: 20% of active users
- Enterprise deals: 3-5 per year
- Avg. revenue per user: €80/year

---

## Constraints & Dependencies

### Technical Constraints
- Browser support: Chrome, Safari, Firefox, Edge (latest 2 versions)
- Mobile support: iOS Safari, Android Chrome
- No offline recording (planned for Phase 3)
- Max 500 concurrent users per deployment

### Business Constraints
- Free tier: 5 matches/month, 3 panels, basic export
- Premium tier: Unlimited matches, 20 panels, advanced export
- Data retention: 2 years free, archive thereafter
- Multi-team support: Phase 3 only

### External Dependencies
- Supabase availability and performance
- File storage limits (AWS S3 backend)
- Real-time latency (network dependent)

---

## Acceptance Criteria

### For Live Coding
- [ ] User can record 100 events in < 5 seconds
- [ ] Statistics update within 200ms of event creation
- [ ] Panel can be switched mid-match without losing data
- [ ] Export contains all recorded events and stats

### For Panel Customization
- [ ] User can create custom button with 8+ properties
- [ ] Button changes visible immediately in CodingInterface
- [ ] Free layout supports drag, resize, and reset
- [ ] Default panel cannot be deleted

### For Team Management
- [ ] User can add player with photo in < 30 seconds
- [ ] Formation can be assigned to match
- [ ] Players appear on field visualization
- [ ] Team logo displays in all reports

### For Statistics
- [ ] All metrics calculate correctly for 200+ events
- [ ] Export contains formatted, readable data
- [ ] Match history loads in < 1 second

---

## Definitions

| Term | Definition |
|---|---|
| **Event** | A single coded action during a match (e.g., "Pass", "Shot") |
| **Button** | UI element that creates an event when clicked |
| **Panel** | Collection of buttons organized for a specific coding scheme |
| **Formation** | Tactical lineup with player positions |
| **Outcome** | Success/Failure/Neutral result for an event |
| **Real-Time** | Updates within 200ms (Supabase Realtime subscription) |
| **Export** | Data download in Excel or CSV format |

---

## Glossary

- **RLS:** Row-Level Security (database access control)
- **Realtime:** Supabase WebSocket subscriptions for live updates
- **Panel Layout:** Grid (auto-positioned) vs Free (manual x/y coordinates)
- **Sub-Button:** Keyword type button triggered by parent event
- **Event Type:** Taxonomy category (system-provided or user-created)

---

**Document Owner:** Product Team
**Last Updated:** March 30, 2026
**Next Review:** April 30, 2026
