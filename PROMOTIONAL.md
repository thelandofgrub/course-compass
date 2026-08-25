# CourseCompass

### Your Personal AI Golf Coach & Virtual Caddie

---

## What Is CourseCompass?

CourseCompass is an all-in-one golf companion app that combines expert instruction, on-course tools, score tracking, and golf trivia into a single beautiful experience. Whether you're picking up a club for the first time or fine-tuning your tournament game, CourseCompass has everything you need — right in your pocket.

**No subscriptions. No ads. No account required.**

---

## Features

### 📚 Golf Academy — Learn at Every Level

Four skill tiers of structured lessons covering every aspect of the game:

- **Beginner (🟢)** — Grip, stance, swing fundamentals, putting basics, etiquette, and rules
- **Intermediate (🟡)** — Shot shaping, course management, bunker play, mental game
- **Advanced (🔴)** — Spin control, wind play, pressure situations, scoring strategies
- **Pro Tips (⚫)** — Tournament preparation, recovery shots, advanced analytics

Each lesson includes step-by-step instruction, practice drills, pro tips, and common mistake warnings. **42 comprehensive lessons** with expandable accordion cards for easy navigation.

---

### 🏌️ Virtual Caddie — 6 Intelligent Tools

**🏒 Club Selector**
Enter your distance to the pin and get an instant club recommendation with expected carry distances for every club in the bag.

**📏 Distance Calculator**
Calculate the true playing distance accounting for elevation change, wind speed, wind direction, and altitude. Know the *effective* distance, not just the measured one.

**🌱 Grass Analyzer**
Detailed profiles of 7 grass types (Bentgrass, Bermuda, Poa Annua, Fescue, Zoysia, Ryegrass, Kikuyu) with how each affects ball roll, spin, and strategy.

**🌤️ Weather Impact Advisor**
Understand how wind, rain, heat, cold, humidity, and altitude affect your ball flight — with visual impact meters showing severity.

**🗺️ Course Strategy — 50 Real-World Courses**
Interactive SVG hole diagrams for 50 famous golf courses worldwide, including:
- Augusta National, Pebble Beach, St Andrews, TPC Sawgrass, Pinehurst No. 2
- Royal Melbourne, Torrey Pines, Bethpage Black, Whistling Straits
- Full-course overview and hole-by-hole navigator with strategy tips, hazard warnings, and recommended shots
- **Automatic geolocation** detects your nearest course

**🔍 Discover Nearby Courses**
Uses OpenStreetMap data to find real golf courses near your current location. One tap adds them to your library.

**🛠️ Custom Course Builder**
Build your own local course with a hole-by-hole editor — set par, yardage, handicap index, and hazards.

**🎯 Shot Advisor**
Visualize your shot with an animated trajectory diagram. Input your lie, distance, and obstacles to get tailored advice.

---

### 📋 Scorekeeper & Handicap System

**Digital Scorecard**
- 1–4 players with custom names and colors
- Score entry for each hole with automatic color coding:
  - 🟡 Eagle or better · 🟢 Birdie · ⬜ Par · 🔴 Bogey · 🔴🔴 Double+
- Running totals, front/back nine splits, and per-player summaries
- **Save Round** button stores completed rounds to local history

**📈 My Progress Dashboard**
- Score trend chart showing improvement over time
- Scoring distribution bar (eagles through double bogeys)
- Stat grid: average score, best round, rounds played, scoring trend
- Full round history table with detailed per-round breakdowns

**💡 Personalized Insights Engine**
10 analysis engines examine your round history and generate tailored coaching suggestions:
- Consistency analysis
- Par-3 / Par-4 / Par-5 performance breakdowns
- Front nine vs. back nine comparison
- Scoring trend direction
- Best-round analysis
- Bogey avoidance patterns
- Practice recommendations

**🔢 Handicap Calculator**
Enter up to 20 rounds (score, course rating, slope rating) and get your official USGA handicap index calculated automatically.

**📊 Scoring Terms Reference**
Visual cards explaining every scoring term from Condor (−4) through Quadruple Bogey (+4), with icons and plain-language descriptions.

---

### 🏆 Leaderboards

**🎮 My Game** — Track your own rounds with Thru Par, To Par, and Gross columns

**🏌️‍♂️ PGA Tour / 🏌️‍♀️ LPGA Tour / 🏅 Majors**
Simulated leaderboard displays for professional tournaments with player names, nationalities, scores, and event details.

---

### 🧠 Trivia & Fun Facts — 224 Items

**❓ Quiz Challenge**
- 126 multiple-choice questions across all golf topics
- 10-question randomized rounds with instant feedback
- Score tracking, per-question review, and explanations
- Replay anytime with fresh question sets (Fisher-Yates shuffle)

**💡 Fun Facts** — 59 fascinating golf facts with icons and descriptions

**📈 Golf Records** — 39 records across 7 categories:
Scoring · Majors · PGA Tour · Distance · Ryder Cup · Women's/LPGA · Amateur

---

### 📖 Golf Glossary

- **100+ golf terms** defined in plain, approachable language
- Instant search with debounced filtering
- Alphabetical filter tabs (A–D, E–H, I–L, M–P, Q–T, U–Z)

---

## Design & Experience

| Feature | Detail |
|---|---|
| **Dark & Light Mode** | One-tap toggle, preference saved automatically |
| **Responsive Design** | Optimized for phones, tablets, laptops, and desktops |
| **Portrait & Landscape** | Adapts layout for both orientations |
| **Offline Capable** | Service worker caches all assets for offline use |
| **Installable** | Add to Home Screen on any device (PWA) |
| **Accessible** | Skip-to-content link, keyboard navigation, screen reader labels, ARIA attributes |
| **Secure** | XSS prevention on all user input, no external tracking |
| **Fast** | No frameworks, no build tools — pure HTML/CSS/JavaScript under 800KB total |

---

## Technical Highlights

- **Pure web technology** — No React, no Angular, no dependencies (except Google Fonts)
- **Zero backend** — Everything runs client-side; your data stays on your device
- **localStorage persistence** — Theme, player name, custom courses, and round history are saved locally
- **50 courses with SVG diagrams** — Dynamically generated per-hole vector graphics
- **OpenStreetMap integration** — Discover real courses near you via Overpass API
- **Geolocation** — Auto-detects nearest course using the Haversine formula
- **Fisher-Yates shuffle** — Unbiased randomization for trivia
- **10-engine insights system** — Personalized coaching from your own data

---

## Platform Availability

| Platform | Status |
|---|---|
| **Web Browser** | ✅ Ready — works in any modern browser |
| **PWA (Add to Home Screen)** | ✅ Ready — installable on iOS, Android, desktop |
| **Android (Google Play)** | 📦 Packaged — Capacitor project ready for Android Studio |
| **iOS (App Store)** | 📦 Packaged — Capacitor project ready for Xcode |
| **Single-File Download** | ✅ `CourseCompass.html` — 803KB self-contained file |

---

## At a Glance

| Metric | Count |
|---|---|
| Lessons | 42 |
| Golf Courses | 50 built-in + unlimited custom |
| Caddie Tools | 6 |
| Trivia Questions | 126 |
| Fun Facts | 59 |
| Golf Records | 39 |
| Glossary Terms | 100+ |
| Insight Engines | 10 |
| Grass Types Profiled | 7 |
| Total App Size | ~800KB |

---

## Who Is It For?

- **Complete beginners** who want structured, jargon-free instruction
- **Weekend golfers** who want a scorecard, handicap tracker, and improvement tips
- **Serious players** who want course strategy, shot analysis, and performance trends
- **Golf enthusiasts** who love trivia, records, and fun facts
- **Coaches and parents** who need a teaching aid with clear, accessible lessons

---

*CourseCompass — From first swing to final putt, your game starts here.* ⛳
