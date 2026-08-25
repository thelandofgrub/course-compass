/* =========================================================
   CourseCompass — Master Data Module
   All golf knowledge, club data, grass types, weather 
   impacts, glossary, trivia, and course data.
   ========================================================= */

/* ── Global HTML Escape Utility (XSS prevention) ──── */
function esc(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

const AppStore = typeof CourseCompassStore !== 'undefined' ? CourseCompassStore : {
    getRaw(key) { return localStorage.getItem(key); },
    setRaw(key, value) { localStorage.setItem(key, String(value)); },
    remove(key) { localStorage.removeItem(key); },
    getJSON(key, fallback = null) {
        try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
        catch { return fallback; }
    },
    setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

const GolfData = {

    /* ── Club Database ──────────────────────────────────── */
    clubs: [
        {
            name: "Driver",
            type: "wood",
            emoji: "🏌️",
            loft: "8°–12°",
            avgDistanceMale: { beginner: 180, intermediate: 220, advanced: 260, pro: 295 },
            avgDistanceFemale: { beginner: 130, intermediate: 170, advanced: 210, pro: 250 },
            description: "The longest club in your bag. Used for tee shots on par 4s and par 5s. It has the biggest head and the longest shaft, which makes it go the farthest — but it's also the hardest to control.",
            bestFor: "Tee shots on long holes (par 4s and par 5s)",
            tips: "Tee the ball high so half the ball is above the club head. Swing smooth — trying to crush it actually makes it go shorter."
        },
        {
            name: "3-Wood",
            type: "wood",
            emoji: "🪵",
            loft: "13°–16°",
            avgDistanceMale: { beginner: 160, intermediate: 200, advanced: 235, pro: 260 },
            avgDistanceFemale: { beginner: 115, intermediate: 155, advanced: 190, pro: 225 },
            description: "Your second-longest club. More accurate than a driver with nearly as much distance. Can be hit off the tee or off the fairway.",
            bestFor: "Tee shots when accuracy matters more than max distance, or long fairway shots",
            tips: "On the fairway, position the ball slightly forward of center in your stance. Sweep through the ball — don't try to scoop it up."
        },
        {
            name: "5-Wood",
            type: "wood",
            emoji: "🪵",
            loft: "17°–20°",
            avgDistanceMale: { beginner: 150, intermediate: 185, advanced: 215, pro: 240 },
            avgDistanceFemale: { beginner: 105, intermediate: 145, advanced: 175, pro: 210 },
            description: "Easier to hit than a 3-wood with a higher ball flight. Great for long approach shots or off the tee on shorter holes.",
            bestFor: "Long approach shots, getting out of light rough, tee shots on tight par 4s",
            tips: "This is many players' favorite 'rescue' club. If you struggle with long irons, the 5-wood is your best friend."
        },
        {
            name: "4-Hybrid",
            type: "hybrid",
            emoji: "🏒",
            loft: "20°–23°",
            avgDistanceMale: { beginner: 140, intermediate: 175, advanced: 200, pro: 225 },
            avgDistanceFemale: { beginner: 100, intermediate: 140, advanced: 165, pro: 195 },
            description: "A mix between a wood and an iron — easier to hit than a long iron with similar distance. The rounded bottom helps it glide through rough.",
            bestFor: "Replacing hard-to-hit long irons, shots from the rough, long approach shots",
            tips: "Swing a hybrid just like an iron — hit down on the ball slightly, don't try to sweep it like a wood."
        },
        {
            name: "5-Iron",
            type: "iron",
            emoji: "⚙️",
            loft: "24°–28°",
            avgDistanceMale: { beginner: 130, intermediate: 160, advanced: 185, pro: 205 },
            avgDistanceFemale: { beginner: 90, intermediate: 130, advanced: 155, pro: 180 },
            description: "A mid-long iron. Produces a medium-high ball flight with decent distance. Requires fairly good contact to hit well.",
            bestFor: "Mid-range approach shots, tee shots on short par 3s",
            tips: "Focus on solid contact rather than power. A well-struck 5-iron goes farther than a badly struck 3-iron."
        },
        {
            name: "6-Iron",
            type: "iron",
            emoji: "⚙️",
            loft: "28°–32°",
            avgDistanceMale: { beginner: 120, intermediate: 150, advanced: 175, pro: 195 },
            avgDistanceFemale: { beginner: 85, intermediate: 120, advanced: 145, pro: 170 },
            description: "A versatile mid-iron. Good balance between distance and accuracy. Easier to hit than the 5-iron.",
            bestFor: "Medium approach shots, punch shots under trees",
            tips: "The 6-iron is great for learning iron play. Practice hitting it with a smooth, controlled swing."
        },
        {
            name: "7-Iron",
            type: "iron",
            emoji: "⚙️",
            loft: "32°–36°",
            avgDistanceMale: { beginner: 110, intermediate: 140, advanced: 165, pro: 185 },
            avgDistanceFemale: { beginner: 75, intermediate: 110, advanced: 135, pro: 160 },
            description: "The 'Goldilocks' iron — not too long, not too short, just right. This is the club most instructors use to teach the golf swing.",
            bestFor: "Most approach shots, learning the golf swing, chip-and-run shots",
            tips: "If you're new to golf, make the 7-iron your best friend. It teaches you proper swing fundamentals better than any other club."
        },
        {
            name: "8-Iron",
            type: "iron",
            emoji: "⚙️",
            loft: "36°–40°",
            avgDistanceMale: { beginner: 100, intermediate: 130, advanced: 155, pro: 175 },
            avgDistanceFemale: { beginner: 68, intermediate: 100, advanced: 125, pro: 150 },
            description: "Produces a nice high ball flight that lands softly. Great for hitting into greens where you need the ball to stop quickly.",
            bestFor: "Approach shots to the green, shots that need to stop fast",
            tips: "Aim to land the ball short of the pin and let it roll to the hole. Don't try to fly it all the way to the pin."
        },
        {
            name: "9-Iron",
            type: "iron",
            emoji: "⚙️",
            loft: "40°–44°",
            avgDistanceMale: { beginner: 90, intermediate: 120, advanced: 140, pro: 160 },
            avgDistanceFemale: { beginner: 60, intermediate: 90, advanced: 115, pro: 135 },
            description: "High-lofted iron that pops the ball up steeply. Ball lands soft with minimal roll. Very forgiving club.",
            bestFor: "Short approach shots, hitting over obstacles, tight pin positions",
            tips: "This is a great club for building confidence. Its high loft makes it very forgiving on mishits."
        },
        {
            name: "Pitching Wedge (PW)",
            type: "wedge",
            emoji: "🔧",
            loft: "44°–48°",
            avgDistanceMale: { beginner: 80, intermediate: 110, advanced: 130, pro: 145 },
            avgDistanceFemale: { beginner: 50, intermediate: 80, advanced: 105, pro: 125 },
            description: "The workhorse wedge. Used for approach shots, pitching (medium-height shots from near the green), and full swings from around 100 yards.",
            bestFor: "Approach shots within 130 yards, pitch shots around the green",
            tips: "Don't always swing 100%. A smooth 80% pitching wedge is more accurate than a full-power swing."
        },
        {
            name: "Gap Wedge (GW)",
            type: "wedge",
            emoji: "🔧",
            loft: "50°–52°",
            avgDistanceMale: { beginner: 70, intermediate: 95, advanced: 115, pro: 130 },
            avgDistanceFemale: { beginner: 45, intermediate: 70, advanced: 90, pro: 110 },
            description: "Fills the 'gap' between your pitching wedge and sand wedge. Gives you better distance control for those in-between yardages.",
            bestFor: "Shots between 80–115 yards, three-quarter pitch shots",
            tips: "If you find yourself always between clubs near the green, the gap wedge solves that problem."
        },
        {
            name: "Sand Wedge (SW)",
            type: "wedge",
            emoji: "🔧",
            loft: "54°–56°",
            avgDistanceMale: { beginner: 55, intermediate: 80, advanced: 100, pro: 115 },
            avgDistanceFemale: { beginner: 35, intermediate: 55, advanced: 75, pro: 95 },
            description: "Designed specifically to escape sand bunkers thanks to its wide, curved bottom (called 'bounce'). Also great for short shots around the green.",
            bestFor: "Bunker shots, high soft shots around the green, getting over obstacles near the green",
            tips: "In a bunker, hit the sand about 2 inches BEHIND the ball — don't try to hit the ball directly. The sand lifts the ball out."
        },
        {
            name: "Lob Wedge (LW)",
            type: "wedge",
            emoji: "🔧",
            loft: "58°–62°",
            avgDistanceMale: { beginner: 40, intermediate: 65, advanced: 85, pro: 100 },
            avgDistanceFemale: { beginner: 25, intermediate: 45, advanced: 60, pro: 80 },
            description: "The highest-lofted club in the bag. Pops the ball almost straight up so it lands super soft with very little roll. The specialty tool for the short game.",
            bestFor: "Flop shots over bunkers, tight pin positions, when you need the ball to stop immediately",
            tips: "This is an advanced club — beginners should use the sand wedge instead. The lob wedge requires precise contact."
        },
        {
            name: "Putter",
            type: "putter",
            emoji: "🏑",
            loft: "2°–5°",
            avgDistanceMale: { beginner: null, intermediate: null, advanced: null, pro: null },
            avgDistanceFemale: { beginner: null, intermediate: null, advanced: null, pro: null },
            description: "Used on and around the green to roll the ball into the hole. This is the most-used club in your bag — you'll use it on every single hole! About 40% of all your strokes are putts.",
            bestFor: "Rolling the ball on the green toward the hole",
            tips: "Keep your head still and use a pendulum motion with your shoulders — NOT your wrists. Read the green for slopes before putting."
        }
    ],

    /* ── Grass Types Database ───────────────────────────── */
    grassTypes: [
        {
            name: "Bermuda Grass",
            emoji: "☀️",
            climate: "Warm (Southern US, tropical regions)",
            appearance: "Thick, coarse, wiry blades with a visible grain (the grass leans one direction)",
            color: "#4a8526",
            onFairway: "Ball sits up nicely on top of the grass, giving clean contact. But the grain direction affects your shots — hitting into the grain creates more resistance and the ball goes shorter.",
            inRough: "Very grabby and thick! Clubs get caught easily. Use more lofted clubs than you normally would. The ball tends to 'sit down' deep in thick Bermuda rough.",
            onGreen: "Putts follow the grain direction. If you're putting WITH the grain (the grass looks shiny), the ball rolls faster. Against the grain (the grass looks dull/dark), it rolls slower. Side grain pushes putts left or right.",
            inBunker: "Sand on Bermuda courses tends to be coarser. Play standard bunker shots but expect slightly less spin.",
            proTip: "Always check the grain direction! Look at the edge of the hole — the side where the grass hangs over tells you the grain direction.",
            commonCourses: "Augusta National (overseeded), most courses in Florida, Texas, Arizona, Southeast US"
        },
        {
            name: "Bentgrass",
            emoji: "❄️",
            climate: "Cool (Northern US, Pacific Northwest, UK, Northern Europe)",
            appearance: "Fine, smooth, dense blades that create a carpet-like surface",
            color: "#5ca032",
            onFairway: "Ball sits on a perfect, tight lie. Great for making clean contact. Bentgrass fairways are a golfer's dream — very consistent.",
            inRough: "Dense but softer than Bermuda. Easier to get the club through. Ball usually sits up a bit, making recovery shots more manageable.",
            onGreen: "The gold standard for putting greens. Smooth, fast, and true — the ball rolls where you aim it. Less grain effect than Bermuda. Greens can be very fast (stimpmeter 11+).",
            inBunker: "Usually paired with fine, soft sand. Standard bunker technique works well. Good spin potential.",
            proTip: "On bent greens, trust your read — the ball rolls very true with minimal grain interference. Focus on speed control.",
            commonCourses: "Pebble Beach, Pinehurst, most courses in the Northern US and UK/Ireland"
        },
        {
            name: "Poa Annua (Annual Bluegrass)",
            emoji: "🔬",
            climate: "Cool, coastal (Pacific coast, many municipal courses)",
            appearance: "Light green, slightly bumpy surface with visible seed heads that look like tiny white flowers",
            color: "#78b94e",
            onFairway: "Good playability, though surfaces can be bumpy. Lies are generally good but inconsistent compared to bentgrass.",
            inRough: "Moderate difficulty. Less grabby than Bermuda. Ball usually has a decent lie in light Poa rough.",
            onGreen: "Bumpy! Especially in the afternoon when the grass grows seed heads. Putts tend to wobble and bounce, especially late in the day. Speed is moderate. Can be frustrating for precision putters.",
            inBunker: "Average sand interaction. No special adjustments needed.",
            proTip: "Putt in the morning when Poa greens are smoothest. In the afternoon, commit to a firm stroke to get the ball rolling through the bumps. Don't expect every putt to roll perfectly.",
            commonCourses: "Pebble Beach (mixed with bent), TPC courses on the West Coast, many public golf courses"
        },
        {
            name: "Zoysia Grass",
            emoji: "🌿",
            climate: "Transition zone (Mid-Atlantic, parts of Japan, Korea)",
            appearance: "Medium texture, dense, spongy feel underfoot, rich dark green",
            color: "#3a6b1e",
            onFairway: "Very spongy and cushioned. The ball sits up perfectly — almost like hitting off a tee. Excellent for clean iron shots.",
            inRough: "VERY thick and tough. Ball sits down significantly. Use more loft than normal. One of the hardest grasses to hit from in the rough.",
            onGreen: "Medium speed, fairly smooth. Good for recreational play. Less common on professional-level putting greens but excellent when maintained well.",
            inBunker: "Dense turf around bunkers can make it hard to get the club under the ball. Open the face more than normal.",
            proTip: "Zoysia fairways are incredibly forgiving — enjoy the perfect lies! But seriously respect the rough — club up and accept getting out is the priority.",
            commonCourses: "Many courses in Japan and South Korea, some US courses in the transition zone"
        },
        {
            name: "Ryegrass (Perennial)",
            emoji: "🌾",
            climate: "Cool season, often used for overseeding warm-season grasses in winter",
            appearance: "Fine to medium blades, bright green, glossy sheen",
            color: "#5ca032",
            onFairway: "Clean, consistent lies. Ball sits well and contact is predictable. Great surface for iron play.",
            inRough: "Moderate resistance. Easier than Bermuda rough but still penalizing for offline shots.",
            onGreen: "Smooth and medium-fast when used as putting surface. Often overseeded onto Bermuda greens in fall/winter, creating a temporarily different putting experience.",
            inBunker: "Standard playability. No unusual characteristics in bunker play.",
            proTip: "When courses transition from Bermuda to overseeded ryegrass (usually October-November), the greens play differently — typically slower and bumpier during the transition.",
            commonCourses: "Most winter-overseeded courses in the South, PGA West, many European courses"
        },
        {
            name: "Fescue",
            emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
            climate: "Cool, coastal, links-style courses",
            appearance: "Thin, wispy blades that can grow quite tall. Moves dramatically in the wind.",
            color: "#9dd474",
            onFairway: "Firm and fast-running. The ball bounces and rolls significantly. You'll hit the ball shorter in the air but it runs much farther on the ground. Very different from US-style golf.",
            inRough: "BRUTALLY thick when grown out. Can be almost unplayable in deep fescue. The wispy blades wrap around your club. Sometimes you just need to chip out sideways — don't try to be a hero.",
            onGreen: "Fescue putting greens are firm, fast, and links-style. Often follow the natural terrain with dramatic undulations. Ball breaks more than you think.",
            inBunker: "Links bunkers (pot bunkers) with fescue edges can be very deep with steep faces. Sometimes you have to play backwards out of them! Sand is often heavy and coarse.",
            proTip: "On links courses with fescue, use the ground! Play bump-and-run shots instead of high lofted shots. The wind and firm ground are your friends if you play along the ground.",
            commonCourses: "St. Andrews, Royal Troon, Royal Portrush, Whistling Straits, Bandon Dunes"
        },
        {
            name: "Kikuyu Grass",
            emoji: "🇿🇦",
            climate: "Subtropical (Southern California, South Africa, parts of Australia)",
            appearance: "Thick, springy, aggressive-growing with a bright green color",
            color: "#4a8526",
            onFairway: "Very spongy — the ball sits up on a cushion. Tends to produce 'flyer' lies where the ball goes farther than expected because grass gets between the club and ball, reducing spin.",
            inRough: "Extremely thick and grabby — one of the toughest grasses to play from. The club gets caught and twisted. Use your most lofted option and just aim to get back to the fairway.",
            onGreen: "Rarely used for greens (too thick), but when it is, expect slow, grainy putts. Most Kikuyu courses use bentgrass greens.",
            inBunker: "Kikuyu edges can grow into bunkers aggressively. Lies near the edges may be complicated by encroaching grass.",
            proTip: "On Kikuyu fairways, expect flyer lies. Club DOWN (use less club than you think) because flyers travel 10-15% farther than normal. Off the fairway, just get it back in play.",
            commonCourses: "Riviera Country Club, Los Angeles CC, many Southern California and South African courses"
        }
    ],

    /* ── Weather Impact Data ────────────────────────────── */
    weather: {
        wind: {
            emoji: "💨",
            title: "Wind",
            impactLevel: 95,
            impactColor: "#ef4444",
            overview: "Wind is the single biggest weather factor in golf. It can add or subtract 20+ yards from your shots and push the ball sideways by 30+ yards.",
            details: [
                { condition: "Headwind (into the wind)", effect: "Ball goes shorter and higher. Add roughly 1 extra club for every 10 mph of headwind. A 20 mph headwind can take 30-40 yards off a drive.", advice: "Club up (use a stronger club), tee the ball lower, and swing easy. A hard swing creates more backspin, making the ball balloon up and go even shorter." },
                { condition: "Tailwind (with the wind)", effect: "Ball goes farther and lower. Subtract about half a club for every 10 mph. A 20 mph tailwind can add 20-25 yards to a drive.", advice: "Club down slightly. The ball will roll more when it lands. On approach shots, allow for extra roll." },
                { condition: "Crosswind (left to right or right to left)", effect: "Ball drifts sideways. A 15 mph crosswind can push the ball 15-25 yards offline.", advice: "Aim upwind of your target and let the wind bring the ball back. Or play a shot shape (draw/fade) into the wind to hold the ball on line." },
                { condition: "Swirling/gusty wind", effect: "Unpredictable ball flight. The ball can move in different directions mid-flight.", advice: "Play lower shots to keep the ball under the wind. Use punch shots and keep the ball below tree-top height when possible." }
            ]
        },
        rain: {
            emoji: "🌧️",
            title: "Rain",
            impactLevel: 75,
            impactColor: "#3b82f6",
            overview: "Rain affects everything — your grip, the ball flight, how far the ball rolls, and how the greens play.",
            details: [
                { condition: "Light rain", effect: "Slightly reduced distance (5-10 yards). Wet greens are softer and slower. Ball stops faster on landing.", advice: "Keep your grips dry with a towel. Expect the ball to check up (stop faster) on the green. You can be more aggressive with approach shots." },
                { condition: "Heavy rain", effect: "Significant distance loss (10-20 yards). Very soft greens. Reduced visibility. Puddles on the course can cause 'casual water' relief.", advice: "Club up 1-2 clubs. Take free drops from standing water. Focus on keeping dry — wet hands = lost control. Consider waiting it out if lightning is near." },
                { condition: "Wet fairways", effect: "Less roll-out on drives (10-20 fewer yards of roll). Mud balls (mud on the ball changes its flight unpredictably).", advice: "Play for carry distance, not total distance. Clean the ball when allowed. Accept you'll lose yards and plan accordingly." },
                { condition: "Wet greens", effect: "Putts roll slower. Less break on the greens. Ball marks/footprints can affect putts.", advice: "Hit putts firmer and straighter. Reduce your read for break. Repair ball marks before putting." }
            ]
        },
        temperature: {
            emoji: "🌡️",
            title: "Temperature",
            impactLevel: 60,
            impactColor: "#f59e0b",
            overview: "Temperature directly affects how far the ball flies. Cold air is denser, creating more drag. Your body also performs differently in extreme temperatures.",
            details: [
                { condition: "Cold (below 50°F / 10°C)", effect: "Ball loses 2-3 yards for every 10°F drop. A golf ball compresses less in cold, reducing energy transfer. Your muscles are tighter, reducing swing speed.", advice: "Club up 1-2 clubs depending on how cold it is. Warm balls in your pocket (keep a spare). Stretch thoroughly before playing. Wear layers you can swing in." },
                { condition: "Hot (above 85°F / 29°C)", effect: "Ball goes 2-3 yards farther per 10°F increase. The ball is more elastic and the air is less dense. But heat exhaustion is a real danger.", advice: "You may need less club. Stay hydrated — drink water before you're thirsty. Use sunscreen, wear a hat, take breaks in shade." },
                { condition: "Mild (60-80°F / 15-27°C)", effect: "Ideal conditions. Ball performs as expected per club distances.", advice: "This is your normal baseline. Enjoy it!" }
            ]
        },
        altitude: {
            emoji: "⛰️",
            title: "Altitude / Elevation",
            impactLevel: 70,
            impactColor: "#8b5cf6",
            overview: "At higher altitudes, the air is thinner (less dense), so there's less drag on the ball. This means the ball flies SIGNIFICANTLY farther.",
            details: [
                { condition: "Sea level (0-1,000 ft)", effect: "Normal ball flight. This is the baseline most distance charts are based on.", advice: "Use standard club distances." },
                { condition: "Mid altitude (3,000-5,000 ft)", effect: "Ball travels about 5-8% farther. That's an extra 10-20 yards on a driver.", advice: "Club down slightly. A 150-yard shot at sea level becomes about 140 yards at this altitude." },
                { condition: "High altitude (5,000+ ft, like Denver or Mexico City)", effect: "Ball travels 10-15% farther! A 200-yard shot becomes 220-230 yards. The ball barely curves because there's less air resistance on spin.", advice: "Subtract 10-15% from your distances. In Denver (5,280 ft), a 7-iron that normally goes 150 yards might fly 168 yards. Adjust every club!" }
            ]
        },
        humidity: {
            emoji: "💧",
            title: "Humidity",
            impactLevel: 20,
            impactColor: "#10b981",
            overview: "Contrary to popular belief, humid air is actually LIGHTER than dry air (water molecules are lighter than nitrogen and oxygen molecules). But the effect is minimal.",
            details: [
                { condition: "High humidity", effect: "Ball may travel 1-3 yards farther. The effect is small but measurable for pros.", advice: "Barely noticeable for most golfers. Focus on grip — sweaty hands are the bigger issue in humidity." },
                { condition: "Low humidity (dry)", effect: "Very slightly shorter ball flight, but essentially negligible.", advice: "Stay hydrated even in dry conditions. Dry air can dehydrate you faster." }
            ]
        }
    },

    /* ── Scoring Terms ──────────────────────────────────── */
    scoringTerms: [
        { name: "Condor", score: -4, description: "4 under par on a single hole. Basically impossible — requires holing out from the tee on a par 5. Has only happened a handful of times ever.", emoji: "🦅", color: "#7c3aed" },
        { name: "Albatross (Double Eagle)", score: -3, description: "3 under par on a single hole. Usually means holing a shot from the fairway on a par 5, or a hole-in-one on a par 4. Extremely rare and exciting!", emoji: "🦤", color: "#2563eb" },
        { name: "Eagle", score: -2, description: "2 under par on a single hole. This means finishing a par 4 in 2 strokes, or a par 5 in 3 strokes. A fantastic achievement at any level!", emoji: "🦅", color: "#d4a017" },
        { name: "Birdie", score: -1, description: "1 under par. Finishing the hole in one fewer stroke than par. This is the bread and butter of scoring well. Even one birdie can make your entire day!", emoji: "🐦", color: "#10b981" },
        { name: "Par", score: 0, description: "The expected number of strokes for a hole. Par 3 = 3 strokes, Par 4 = 4, Par 5 = 5. Includes 2 putts in the calculation. Making par means you played the hole as designed.", emoji: "✅", color: "#6b7280" },
        { name: "Bogey", score: 1, description: "1 over par. One extra stroke beyond par. Very common for recreational golfers. There's no shame in a bogey — even pros make them!", emoji: "😐", color: "#f59e0b" },
        { name: "Double Bogey", score: 2, description: "2 over par. Two extra strokes beyond par. Happens when things go a bit sideways — maybe a missed fairway and a missed green.", emoji: "😟", color: "#ef4444" },
        { name: "Triple Bogey", score: 3, description: "3 over par. Usually involves some trouble — a penalty stroke, a bunker, or a few missed putts. Shake it off and move on!", emoji: "😫", color: "#991b1b" },
        { name: "Hole-in-One (Ace)", score: "Special", description: "Hitting the ball directly into the hole from the tee! Most common on par 3s. The odds for an amateur are about 12,500 to 1. If you get one, tradition says you buy drinks for everyone in the clubhouse!", emoji: "🎯", color: "#7c3aed" }
    ],

    /* ── Daily Tips ──────────────────────────────────────── */
    dailyTips: [
        "Aim for the center of the green, not the pin. You'll avoid more trouble and lower your scores faster.",
        "Your pre-shot routine should be the same every time — like a free throw in basketball. Consistency breeds confidence.",
        "The most important 6 inches in golf are between your ears. Stay positive after bad shots — the next one is a new opportunity.",
        "Practice your putting more than anything else. Putting accounts for about 40% of all your strokes!",
        "When in doubt, use more club. Most amateurs miss short, not long. 'Never up, never in' applies to irons too.",
        "Your grip pressure should feel like holding a tube of toothpaste without squeezing any out — firm but not tight.",
        "Take a deep breath before every shot. It lowers your heart rate and helps you focus.",
        "Play the course, not the scorecard. Focus on one shot at a time instead of your total score.",
        "In a bunker, commit to the shot. Deceleration is the #1 cause of failed bunker shots.",
        "On the green, walk the entire line of your putt. Look at it from behind the ball AND behind the hole.",
        "The driver is not always the best club off the tee. Sometimes an iron or hybrid that stays in the fairway is smarter.",
        "Keep your left arm relatively straight (for right-handed golfers) through the backswing for consistency.",
        "Your feet, hips, and shoulders should all be parallel to your target line. Use alignment sticks in practice.",
        "Never change your swing mid-round. Save changes for the range. On the course, dance with the swing you brought.",
        "Stay hydrated! Dehydration costs you 2-3 mph of swing speed — that's 6-10 yards of distance.",
        "If you're short-sided (pin is close to your side), play to the fat part of the green instead of a hero shot.",
        "Practice with purpose. 30 minutes of focused practice beats 2 hours of mindlessly hitting balls.",
        "Always repair your ball marks on the green. A repaired mark heals in 24 hours; an unrepaired one takes 2 weeks.",
        "Invest in a proper fitting for your clubs. Off-the-rack clubs may not suit your body and swing.",
        "The best way to improve fast? Take lessons from a PGA professional instructor."
    ],

    /* ── Glossary ───────────────────────────────────────── */
    glossary: [
        { term: "Ace", definition: "A hole-in-one. When you hit the ball from the tee directly into the hole in just one stroke. Super rare and super exciting!" },
        { term: "Address", definition: "The position you take when standing over the ball, ready to swing. Getting into your setup before hitting." },
        { term: "Albatross", definition: "Three strokes under par on a single hole (also called a Double Eagle). One of the rarest feats in golf." },
        { term: "Approach Shot", definition: "Any shot intended to land on the green. Usually your second shot on a par 4 or third shot on a par 5." },
        { term: "Apron", definition: "The short grass area immediately surrounding the putting green. Also called the 'fringe' or 'collar'." },
        { term: "Away", definition: "The ball farthest from the hole. The player who is 'away' traditionally plays first." },
        { term: "Back Nine", definition: "Holes 10 through 18 on a golf course. The second half of a full round." },
        { term: "Backspin", definition: "The backward rotation on the ball that helps it stop quickly on the green. More loft and clean contact = more backspin." },
        { term: "Birdie", definition: "One stroke under par on a hole. A great score! Named because the term 'bird' was old slang for something excellent." },
        { term: "Bogey", definition: "One stroke over par on a hole. Very common for recreational players and nothing to be embarrassed about." },
        { term: "Bounce", definition: "The angle on the bottom of a wedge that prevents it from digging into the ground or sand. Higher bounce = better for soft sand." },
        { term: "Break", definition: "The curve a putt takes due to the slope of the green. Reading the break means figuring out which way the ball will curve." },
        { term: "Bunker", definition: "A sand-filled hazard on the course. Can be on the fairway (fairway bunker) or next to the green (greenside bunker). Also called a 'sand trap' in casual speech." },
        { term: "Caddie", definition: "A person who carries a player's clubs and provides advice on strategy, club selection, and reading greens." },
        { term: "Carry", definition: "The distance the ball travels through the air before it first hits the ground. Important for clearing hazards." },
        { term: "Cart Path", definition: "A paved path for golf carts. If your ball lands on it, you usually get free relief (can move the ball without penalty)." },
        { term: "Chip", definition: "A short, low shot played around the green, designed to fly a little and roll a lot toward the hole. Uses minimal air time." },
        { term: "Clubface", definition: "The flat hitting surface of the golf club that contacts the ball. Where the grooves are." },
        { term: "Clubhead Speed", definition: "How fast the clubhead is moving when it hits the ball. Faster = farther. Measured in miles per hour (mph)." },
        { term: "Course Rating", definition: "A number (like 72.4) that indicates the difficulty of a course for a scratch golfer. Used in handicap calculations." },
        { term: "Cut (Fade)", definition: "A shot that curves gently from left to right (for a right-handed player). A controlled cut is called a fade." },
        { term: "Divot", definition: "A chunk of turf that gets carved out when you hit an iron shot. Always replace your divots or fill them with the sand mix!" },
        { term: "Dogleg", definition: "A hole where the fairway curves to the left or right instead of going straight. Like a dog's hind leg shape." },
        { term: "Double Bogey", definition: "Two strokes over par on a hole. Usually means something went wrong, but it's a great learning moment." },
        { term: "Double Eagle", definition: "Same as an Albatross — three strokes under par on a single hole. Called this mostly in the United States." },
        { term: "Draw", definition: "A shot that curves gently from right to left (for a right-handed player). Many pros prefer this shape because the ball rolls farther." },
        { term: "Drive", definition: "The first shot on a hole, usually hit with a driver from the tee box." },
        { term: "Driver", definition: "The biggest club in your bag with the lowest loft. Designed for maximum distance off the tee." },
        { term: "Drop", definition: "Placing the ball back in play after it's been lost, gone out of bounds, or in a hazard. Done by holding the ball at knee height and dropping it." },
        { term: "Eagle", definition: "Two strokes under par on a hole. Finishing a par 5 in 3 or a par 4 in 2. A huge accomplishment!" },
        { term: "Etiquette", definition: "The unwritten (and sometimes written) rules of behavior on the golf course. Being quiet during someone's swing, fixing ball marks, etc." },
        { term: "Fade", definition: "A controlled shot that curves gently left to right (for righties). Considered the most reliable shot shape by many instructors." },
        { term: "Fairway", definition: "The closely mowed strip of grass between the tee and the green. Where you want your ball to be! Best lies and easiest shots." },
        { term: "Fat Shot", definition: "Hitting the ground before the ball. Results in a shorter shot because the ground absorbs the energy. Also called 'chunking' it." },
        { term: "Flag / Flagstick", definition: "The pole with a flag sitting in the hole on the green so you can see it from far away. Also called the 'pin'." },
        { term: "Flop Shot", definition: "A high, soft shot that goes up steeply and lands with very little roll. Used to get over obstacles close to the green." },
        { term: "Follow Through", definition: "The part of the swing after you hit the ball. A full follow-through means you didn't slow down or 'quit' on the shot." },
        { term: "Fore!", definition: "The warning shout when your ball is heading toward other people. ALWAYS yell 'FORE!' if there's any chance of hitting someone!" },
        { term: "Front Nine", definition: "Holes 1 through 9. The first half of a full 18-hole round." },
        { term: "GIR (Green in Regulation)", definition: "Reaching the putting green in the expected number of strokes minus 2 (to allow for 2 putts). Par minus 2 strokes." },
        { term: "Gimme", definition: "A putt so short that other players say 'just pick it up — we know you'd make it.' Only in casual/friendly play. Not in official competition." },
        { term: "Green", definition: "The very smooth, very short grass area around the hole where you putt. Also called the putting green." },
        { term: "Grounding the Club", definition: "Touching the ground with your club before the swing. Not allowed in bunkers under the rules (before 2019), though rules have relaxed in penalty areas." },
        { term: "Gross Score", definition: "Your total number of strokes WITHOUT any handicap adjustment. The raw number." },
        { term: "Handicap", definition: "A number that represents your skill level. A lower handicap = better player. A handicap of 0 (scratch) means you typically shoot par. It allows players of different abilities to compete fairly." },
        { term: "Hazard", definition: "An obstacle on the course designed to test your skill. Water hazards (ponds, lakes, streams) and bunkers are common hazards." },
        { term: "Hole-in-One", definition: "Hitting the ball into the hole in just one stroke from the tee. The dream shot! Most commonly happens on par 3 holes." },
        { term: "Hook", definition: "A shot that curves dramatically from right to left (for right-handers). More severe than a draw. Usually unintentional and problematic." },
        { term: "Hybrid", definition: "A club that combines the best features of a wood and an iron. Easier to hit than long irons with similar distance." },
        { term: "Impact", definition: "The moment the clubface contacts the ball. Everything before this point (grip, stance, backswing) is just preparation for good impact." },
        { term: "Iron", definition: "Clubs numbered 3-9 plus pitching wedge, made of metal with flat faces. Used for shots from the fairway, rough, and tee." },
        { term: "Lag Putt", definition: "A long putt where the main goal is to get the ball close to the hole (within 2-3 feet) rather than trying to make it. Smart putting strategy!" },
        { term: "Lay Up", definition: "Intentionally hitting the ball shorter than you could to avoid a hazard. Playing smart instead of going for it." },
        { term: "Lie", definition: "Two meanings: (1) How the ball is sitting on the ground (good lie = flat, sitting up nicely). (2) Your score count on a hole ('lying 3' means you've taken 3 strokes)." },
        { term: "Line", definition: "The intended path of the ball, either through the air or on the green. 'Reading the line' means figuring out the putt's path." },
        { term: "Links", definition: "A style of golf course built on sandy coastal land. Characterized by wind exposure, firm turf, few trees, and deep bunkers. The original style of golf from Scotland." },
        { term: "Lip Out", definition: "When the ball catches the edge of the hole and spins around the rim but doesn't fall in. The most heartbreaking thing in golf." },
        { term: "Loft", definition: "The angle of the clubface. More loft = higher the ball goes, shorter the distance. A driver has low loft (~10°), a lob wedge has high loft (~60°)." },
        { term: "Match Play", definition: "A format where you compete hole by hole against another player. Win the hole by taking fewer strokes. Win the most holes to win the match." },
        { term: "Mulligan", definition: "A free do-over shot. NOT in the official rules, but very common in casual play. 'I'll take a mulligan on that one!'" },
        { term: "Nassau", definition: "A popular betting format with three bets: front nine, back nine, and overall 18. A '$2 Nassau' means $2 on each bet." },
        { term: "Net Score", definition: "Your gross score minus your handicap strokes. This is the score used for handicapped competitions so different skill levels can compete fairly." },
        { term: "OB (Out of Bounds)", definition: "The area outside the boundaries of the golf course, usually marked by white stakes. If your ball goes OB, you get a one-stroke penalty and must re-hit." },
        { term: "Par", definition: "The number of strokes an expert golfer is expected to take on a hole or course. Standard pars: par 3 (short), par 4 (medium), par 5 (long)." },
        { term: "Penalty Stroke", definition: "An extra stroke added to your score as a consequence of breaking a rule or hitting into a hazard. Goes on your scorecard but isn't a physical swing." },
        { term: "Pin", definition: "Another name for the flagstick — the pole in the hole on the green." },
        { term: "Pin High", definition: "When your ball lands at the same distance as the hole, just left or right. Good distance control!" },
        { term: "Pitch", definition: "A medium-height, medium-length shot to the green. More air time than a chip, less than a full swing. Usually 20-60 yards." },
        { term: "Provisional", definition: "A second ball played when you think your first ball might be lost or out of bounds. Saves time instead of walking back to re-hit." },
        { term: "Punch Shot", definition: "A low, controlled shot hit with a shorter backswing. Used to stay under tree branches or into strong wind." },
        { term: "Putt", definition: "A shot played on the green using the putter, rolling the ball along the ground toward the hole." },
        { term: "Range", definition: "Short for 'driving range' or 'practice range.' An area where you hit practice balls. Also where you warm up before a round." },
        { term: "Relief", definition: "Permission to move your ball without penalty from an abnormal condition (sprinkler head, casual water, cart path, etc.)." },
        { term: "Rough", definition: "The longer, thicker grass bordering the fairway. Harder to hit from because the grass grabs your club." },
        { term: "Scramble", definition: "A fun team format where everyone tees off, the best shot is chosen, and everyone plays from that spot. Repeated until the ball is holed. Great for groups of mixed abilities!" },
        { term: "Scratch Golfer", definition: "A player with a 0 handicap — they typically shoot around par. About 1-2% of all golfers are scratch players." },
        { term: "Shaft", definition: "The long tube of the club that connects the grip to the clubhead. Can be steel (heavier, more control) or graphite (lighter, more speed)." },
        { term: "Shank", definition: "When the ball hits the hosel (the joint where the shaft meets the clubhead) instead of the face, sending it wildly right. The worst word in golf — some players are superstitious about even saying it!" },
        { term: "Short Game", definition: "All the shots played from about 100 yards and in: chipping, pitching, bunker shots, and putting. This is where scoring happens!" },
        { term: "Slice", definition: "A shot that curves dramatically from left to right (for right-handers). The most common miss for beginners. Usually caused by an open clubface at impact." },
        { term: "Slope Rating", definition: "A number (55-155, with 113 being average) that indicates how much harder the course is for a bogey golfer compared to a scratch golfer. Used in handicap calculations." },
        { term: "Stance", definition: "The position of your feet when addressing the ball. Width, alignment, and ball position all matter." },
        { term: "Stimpmeter", definition: "A device that measures green speed. A ball is rolled down a standard ramp, and the distance it rolls measures the speed. Tour greens are typically 11-13 on the stimpmeter." },
        { term: "Stroke Play", definition: "The most common format. Total up all your strokes over 18 holes. Lowest total wins. This is how most professional tournaments are played." },
        { term: "Sweet Spot", definition: "The ideal contact point on the clubface — the center. Hitting the sweet spot produces the best distance and accuracy." },
        { term: "Tee", definition: "Two meanings: (1) The small peg you place the ball on for the first shot of each hole. (2) The designated area where you hit that first shot (the 'tee box')." },
        { term: "Tempo", definition: "The speed and rhythm of your golf swing. Good tempo means a smooth, consistent pace — not too fast, not too slow." },
        { term: "Thin Shot", definition: "Hitting the ball with the bottom edge of the club instead of the face. The ball flies low and too far. Also called 'blading' it. Opposite of a fat shot." },
        { term: "Top", definition: "Hitting the top of the ball, causing it to roll along the ground instead of flying. Usually happens when you lift your body during the swing." },
        { term: "Triple Bogey", definition: "Three strokes over par on a hole. Time to take a deep breath and move on to the next one!" },
        { term: "Wedge", definition: "High-lofted clubs used for short shots. Types: Pitching Wedge (PW), Gap Wedge (GW), Sand Wedge (SW), Lob Wedge (LW)." },
        { term: "Whiff", definition: "A complete miss — swinging at the ball and not making contact. It still counts as a stroke if you intended to hit it." },
        { term: "Yardage", definition: "The distance measurement on a golf course, typically from tees to green and to hazards." },
        { term: "Yips", definition: "A nervous condition that causes involuntary wrist spasms during putting or chipping. A real, documented condition that has ended professional careers." }
    ],

    /* ── Course Database ───────────────────────────────── */
    /* Each course has: id, name, location, lat/lon (for geolocation matching),
       grass, style, rating/slope, and 18 holes with visual layout data.
       Hole layout: fairwayShape (straight/dogleg-left/dogleg-right/s-curve),
       hazards[] with type+position, green shape, elevation change. */
    /* ODbL/open-source course snapshot loaded by js/course-data-open.js. */
    courses: Array.isArray(globalThis.CourseCompassBuiltInCourses) ? globalThis.CourseCompassBuiltInCourses : [],

    /* defaultCourse points to the first course for backward compat */
    get defaultCourse() {
        return this.courses[0];
    },

    /* ── Custom / Discovered Courses (localStorage) ─── */
    get customCourses() {
        try {
            const parsed = AppStore.getJSON('coursecompass-custom-courses', []);
            return Array.isArray(parsed)
                ? parsed.filter(course => course && typeof course.id === 'string')
                    .map(course => ({ ...course, holes: Array.isArray(course.holes) ? course.holes : [] }))
                : [];
        } catch { return []; }
    },
    set customCourses(arr) {
        AppStore.setJSON('coursecompass-custom-courses', arr);
    },
    addCustomCourse(course) {
        const existing = this.customCourses;
        // Avoid duplicates by id
        if (existing.some(c => c.id === course.id)) return false;
        existing.push(course);
        this.customCourses = existing;
        return true;
    },
    updateCustomCourse(id, course) {
        const existing = this.customCourses;
        const index = existing.findIndex(item => item.id === id);
        if (index < 0 || !course || typeof course.id !== 'string') return false;
        existing[index] = course;
        this.customCourses = existing;
        return true;
    },
    upsertCustomCourse(course) {
        if (!course || typeof course.id !== 'string') return false;
        const existing = this.customCourses;
        const index = existing.findIndex(item => item.id === course.id || (
            course.source?.providerId && item.source?.provider === course.source?.provider && item.source?.providerId === course.source.providerId
        ));
        if (index >= 0) existing[index] = { ...course, id: existing[index].id };
        else existing.push(course);
        this.customCourses = existing;
        return true;
    },
    removeCustomCourse(id) {
        this.customCourses = this.customCourses.filter(c => c.id !== id);
    },
    /* All courses: built-in 50 + user custom/discovered */
    get allCourses() {
        return [...this.courses, ...this.customCourses];
    },

    get selectedCourseId() {
        return AppStore.getRaw('coursecompass-selected-course-id') || '';
    },
    set selectedCourseId(id) {
        if (id) AppStore.setRaw('coursecompass-selected-course-id', String(id));
        else AppStore.remove('coursecompass-selected-course-id');
    },
    get selectedCourse() {
        return this.allCourses.find(course => course.id === this.selectedCourseId) || this.defaultCourse;
    },

    /* Personal club bag (carry, total distance, and typical dispersion) */
    get clubProfile() {
        try {
            const parsed = AppStore.getJSON('coursecompass-club-profile', null);
            if (!parsed || parsed.version !== 1 || !parsed.clubs || typeof parsed.clubs !== 'object') return null;

            const validNames = new Set(this.clubs.filter(club => club.type !== 'putter').map(club => club.name));
            const clubs = {};
            Object.entries(parsed.clubs).forEach(([name, values]) => {
                if (!validNames.has(name) || !values || typeof values !== 'object') return;
                const carry = Number(values.carry);
                const total = Number(values.total);
                const dispersion = Number(values.dispersion);
                if (!Number.isFinite(carry) || carry < 1 || carry > 400) return;
                clubs[name] = {
                    enabled: values.enabled !== false,
                    carry: Math.round(carry),
                    total: Number.isFinite(total) ? Math.max(Math.round(total), Math.round(carry)) : Math.round(carry),
                    dispersion: Number.isFinite(dispersion) ? Math.min(100, Math.max(1, Math.round(dispersion))) : 15
                };
            });
            return Object.keys(clubs).length ? { version: 1, clubs } : null;
        } catch { return null; }
    },
    set clubProfile(profile) {
        if (profile) AppStore.setJSON('coursecompass-club-profile', profile);
        else AppStore.remove('coursecompass-club-profile');
    },
    clearClubProfile() {
        AppStore.remove('coursecompass-club-profile');
    },

    /* Measured shots used to learn real club distances. Mishits are retained for review
       but excluded from learned-distance calculations. */
    get clubShotHistory() {
        try {
            const parsed = AppStore.getJSON('coursecompass-club-shot-history', []);
            if (!Array.isArray(parsed)) return [];
            const validNames = new Set(this.clubs.filter(club => club.type !== 'putter').map(club => club.name));
            const validLies = new Set(['tee', 'fairway', 'rough', 'range']);
            const validQualities = new Set(['solid', 'normal', 'mishit']);
            return parsed.filter(shot => {
                const carry = Number(shot?.carry);
                const total = Number(shot?.total);
                const offline = Number(shot?.offline);
                return shot && typeof shot.id === 'string' && /^shot-[a-z0-9-]+$/i.test(shot.id) && validNames.has(shot.club) &&
                    Number.isFinite(carry) && carry >= 1 && carry <= 400 &&
                    Number.isFinite(total) && total >= carry && total <= 450 &&
                    Number.isFinite(offline) && Math.abs(offline) <= 100 &&
                    validLies.has(shot.lie) && validQualities.has(shot.quality);
            }).map(shot => ({
                id: shot.id,
                club: shot.club,
                carry: Math.round(Number(shot.carry)),
                total: Math.round(Number(shot.total)),
                offline: Math.round(Number(shot.offline)),
                lie: shot.lie,
                quality: shot.quality,
                date: typeof shot.date === 'string' ? shot.date : '',
                source: shot.source === 'round' ? 'round' : 'manual',
                courseId: typeof shot.courseId === 'string' ? shot.courseId.slice(0, 100) : '',
                courseName: typeof shot.courseName === 'string' ? shot.courseName.slice(0, 100) : '',
                hole: Number.isInteger(Number(shot.hole)) && Number(shot.hole) > 0 && Number(shot.hole) <= 99 ? Number(shot.hole) : null,
                playerName: typeof shot.playerName === 'string' ? shot.playerName.slice(0, 80) : ''
            })).slice(-500);
        } catch { return []; }
    },
    set clubShotHistory(shots) {
        AppStore.setJSON('coursecompass-club-shot-history', Array.isArray(shots) ? shots.slice(-500) : []);
    },
    addClubShot(shot) {
        const history = this.clubShotHistory;
        const saved = {
            ...shot,
            id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            date: new Date().toISOString()
        };
        history.push(saved);
        this.clubShotHistory = history;
        return saved.id;
    },
    deleteClubShot(id) {
        this.clubShotHistory = this.clubShotHistory.filter(shot => shot.id !== id);
    },
    clearClubShotHistory() {
        AppStore.remove('coursecompass-club-shot-history');
    },

    /* ── Active Round (autosave / resume) ────────────── */
    get activeRound() {
        try {
            const parsed = AppStore.getJSON('coursecompass-active-round', null);
            return parsed && parsed.version === 1 && Array.isArray(parsed.players) && parsed.scores
                ? parsed
                : null;
        } catch { return null; }
    },
    set activeRound(round) {
        if (round) AppStore.setJSON('coursecompass-active-round', round);
        else AppStore.remove('coursecompass-active-round');
    },
    clearActiveRound() {
        AppStore.remove('coursecompass-active-round');
    },

    /* ── Round History (localStorage persistence) ─────── */
    get roundHistory() {
        try {
            const parsed = AppStore.getJSON('coursecompass-round-history', []);
            return Array.isArray(parsed)
                ? parsed.filter(round => round && typeof round.id === 'string' && Array.isArray(round.players))
                : [];
        } catch { return []; }
    },
    set roundHistory(arr) {
        AppStore.setJSON('coursecompass-round-history', arr);
    },
    saveRound(round) {
        // round = { id, date, courseName, courseId, par, rating, slope, players: [{ name, color, scores:{1:n,...}, totalScore, toPar, eagles, birdies, pars, bogeys, doubles, front9, back9, fairwaysHit?, putts?, gir? }] }
        const history = this.roundHistory;
        round.id = round.id || `round-${Date.now()}`;
        history.push(round);
        this.roundHistory = history;
        return round.id;
    },
    deleteRound(id) {
        this.roundHistory = this.roundHistory.filter(r => r.id !== id);
    },
    getPlayerRounds(playerName) {
        // Return all rounds that include a given player, with that player's stats
        const history = this.roundHistory;
        const results = [];
        history.forEach(round => {
            const normalizedName = String(playerName || '').toLowerCase();
            const p = round.players.find(pl => String(pl?.name || '').toLowerCase() === normalizedName);
            if (p) {
                results.push({
                    roundId: round.id,
                    date: round.date,
                    courseName: round.courseName,
                    courseId: round.courseId,
                    par: round.par,
                    rating: round.rating || 0,
                    slope: round.slope || 0,
                    ...p
                });
            }
        });
        return results.sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    /* ── PGA/LPGA Tournament Data (Simulated 2026 Season) ── */
    pgaTournaments: [
        { name: "The Masters", dates: "Apr 9–12, 2026", course: "Augusta National GC", location: "Augusta, GA", purse: "$20,000,000", status: "upcoming" },
        { name: "PGA Championship", dates: "May 14–17, 2026", course: "Aronimink GC", location: "Newtown Square, PA", purse: "$17,500,000", status: "upcoming" },
        { name: "U.S. Open", dates: "Jun 18–21, 2026", course: "Shinnecock Hills GC", location: "Southampton, NY", purse: "$21,500,000", status: "upcoming" },
        { name: "The Open Championship", dates: "Jul 16–19, 2026", course: "Royal Portrush GC", location: "Co. Antrim, N. Ireland", purse: "$17,000,000", status: "upcoming" },
        { name: "The Players Championship", dates: "Mar 12–15, 2026", course: "TPC Sawgrass", location: "Ponte Vedra Beach, FL", purse: "$25,000,000", status: "completed" },
        { name: "Arnold Palmer Invitational", dates: "Mar 5–8, 2026", course: "Bay Hill Club & Lodge", location: "Orlando, FL", purse: "$20,000,000", status: "completed" },
        { name: "RBC Heritage", dates: "Apr 16–19, 2026", course: "Harbour Town GL", location: "Hilton Head, SC", purse: "$20,000,000", status: "upcoming" },
        { name: "Wells Fargo Championship", dates: "May 7–10, 2026", course: "Quail Hollow Club", location: "Charlotte, NC", purse: "$20,000,000", status: "upcoming" }
    ],

    lpgaTournaments: [
        { name: "Chevron Championship", dates: "Apr 16–19, 2026", course: "Carlton Woods", location: "The Woodlands, TX", purse: "$7,900,000", status: "upcoming" },
        { name: "U.S. Women's Open", dates: "Jun 4–7, 2026", course: "Riviera CC", location: "Pacific Palisades, CA", purse: "$12,000,000", status: "upcoming" },
        { name: "Women's PGA Championship", dates: "Jun 25–28, 2026", course: "Sahalee CC", location: "Sammamish, WA", purse: "$10,400,000", status: "upcoming" },
        { name: "The Evian Championship", dates: "Jul 9–12, 2026", course: "Evian Resort GC", location: "Évian-les-Bains, France", purse: "$8,000,000", status: "upcoming" },
        { name: "AIG Women's Open", dates: "Aug 6–9, 2026", course: "Dundonald Links", location: "Ayrshire, Scotland", purse: "$9,000,000", status: "upcoming" },
        { name: "CME Group Tour Championship", dates: "Nov 19–22, 2026", course: "Tiburón GC", location: "Naples, FL", purse: "$11,000,000", status: "upcoming" }
    ],

    /* ── Simulated Leaderboard Data ─────────────────────── */
    pgaLeaderboard: [
        { pos: 1, name: "Scottie Scheffler", country: "🇺🇸", score: -14, thru: "F", today: -5, rounds: [66, 68, 67, 67] },
        { pos: 2, name: "Rory McIlroy", country: "🇬🇧", score: -12, thru: "F", today: -4, rounds: [67, 69, 66, 68] },
        { pos: 3, name: "Xander Schauffele", country: "🇺🇸", score: -11, thru: "F", today: -3, rounds: [68, 67, 70, 66] },
        { pos: "T4", name: "Jon Rahm", country: "🇪🇸", score: -10, thru: "F", today: -2, rounds: [69, 68, 67, 68] },
        { pos: "T4", name: "Collin Morikawa", country: "🇺🇸", score: -10, thru: "F", today: -6, rounds: [71, 70, 65, 66] },
        { pos: 6, name: "Ludvig Åberg", country: "🇸🇪", score: -9, thru: "F", today: -3, rounds: [69, 68, 68, 68] },
        { pos: 7, name: "Viktor Hovland", country: "🇳🇴", score: -8, thru: "F", today: -1, rounds: [70, 67, 68, 69] },
        { pos: 8, name: "Patrick Cantlay", country: "🇺🇸", score: -7, thru: "F", today: -2, rounds: [69, 70, 67, 69] },
        { pos: "T9", name: "Wyndham Clark", country: "🇺🇸", score: -6, thru: "F", today: -4, rounds: [70, 71, 67, 66] },
        { pos: "T9", name: "Tommy Fleetwood", country: "🇬🇧", score: -6, thru: "F", today: -3, rounds: [69, 69, 69, 67] },
        { pos: 11, name: "Hideki Matsuyama", country: "🇯🇵", score: -5, thru: "F", today: -1, rounds: [70, 69, 68, 70] },
        { pos: 12, name: "Sam Burns", country: "🇺🇸", score: -4, thru: "F", today: 0, rounds: [69, 70, 69, 70] }
    ],

    lpgaLeaderboard: [
        { pos: 1, name: "Nelly Korda", country: "🇺🇸", score: -16, thru: "F", today: -5, rounds: [64, 67, 66, 67] },
        { pos: 2, name: "Lydia Ko", country: "🇳🇿", score: -13, thru: "F", today: -4, rounds: [67, 68, 66, 68] },
        { pos: 3, name: "Lilia Vu", country: "🇺🇸", score: -12, thru: "F", today: -3, rounds: [68, 67, 68, 67] },
        { pos: 4, name: "Celine Boutier", country: "🇫🇷", score: -11, thru: "F", today: -5, rounds: [69, 69, 65, 68] },
        { pos: 5, name: "Jin Young Ko", country: "🇰🇷", score: -10, thru: "F", today: -2, rounds: [68, 69, 67, 68] },
        { pos: 6, name: "Minjee Lee", country: "🇦🇺", score: -9, thru: "F", today: -3, rounds: [69, 68, 68, 68] },
        { pos: 7, name: "Charley Hull", country: "🇬🇧", score: -8, thru: "F", today: -2, rounds: [70, 68, 67, 69] },
        { pos: 8, name: "Rose Zhang", country: "🇺🇸", score: -7, thru: "F", today: -1, rounds: [69, 70, 67, 70] },
        { pos: 9, name: "Ayaka Furue", country: "🇯🇵", score: -6, thru: "F", today: -4, rounds: [70, 71, 67, 66] },
        { pos: 10, name: "Hae Ran Ryu", country: "🇰🇷", score: -5, thru: "F", today: -2, rounds: [70, 69, 69, 69] }
    ],

    /* ── Golf Records ───────────────────────────────────── */
    records: [
        /* ═══ SCORING RECORDS ═══ */
        { record: "Lowest 72-Hole PGA Tour Score", value: "253 (−35)", holder: "Justin Thomas (2017 Sony Open)", detail: "That's averaging 63.25 per round — mind-blowing." },
        { record: "Lowest Single Round (PGA Tour)", value: "58", holder: "Jim Furyk (2016 Travelers Championship)", detail: "The only sub-60 round in PGA Tour history at the time. Now joined by others." },
        { record: "Lowest Score Relative to Par (Major)", value: "−20 (264)", holder: "Henrik Stenson (2016 Open Championship)", detail: "Battled Phil Mickelson (−17) in one of history's greatest major finals." },
        { record: "Lowest 18-Hole Score (LPGA Tour)", value: "59", holder: "Annika Sörenstam (2001 Standard Register PING)", detail: "The first and still only woman to break 60 in an official professional tournament." },
        { record: "Lowest Round (European Tour)", value: "59 (−12)", holder: "Oliver Fisher (2018 Portugal Masters)", detail: "The first 59 in European Tour history. He birdied 5 of his last 6 holes to achieve it." },
        { record: "Lowest Score for 9 Holes (PGA Tour)", value: "27 (−9)", holder: "Multiple players", detail: "Achieved by several pros including Corey Pavin and Mark Calcavecchia. That's nine consecutive birdies — or equivalent." },
        { record: "Lowest Scoring Average (Season)", value: "68.17", holder: "Tiger Woods (2000)", detail: "Broke Byron Nelson's 1945 record of 68.33 that had stood for 55 years. Woods won 9 events that season." },

        /* ═══ MAJOR CHAMPIONSHIP RECORDS ═══ */
        { record: "Most Major Championships (Men)", value: "18", holder: "Jack Nicklaus", detail: "The Golden Bear won his first major in 1962 and his last in 1986 at age 46." },
        { record: "Most Major Championships (Women)", value: "15", holder: "Patty Berg", detail: "Won between 1937 and 1958. An absolute pioneer of women's golf." },
        { record: "Largest Winning Margin (Major)", value: "15 strokes", holder: "Tiger Woods (2000 U.S. Open, Pebble Beach)", detail: "The most dominant performance in major championship history. He was the only player under par." },
        { record: "Youngest Masters Winner", value: "21 years, 3 months", holder: "Tiger Woods (1997)", detail: "Won by 12 strokes — the largest margin in Masters history." },
        { record: "Oldest Major Winner (Men)", value: "48 years, 4 months", holder: "Julius Boros (1968 PGA Championship)", detail: "Phil Mickelson also won at 50 years old (2021 PGA) — remarkably close." },
        { record: "Youngest Major Winner (Men)", value: "17 years, 5 months", holder: "Young Tom Morris (1868 Open Championship)", detail: "Won the first of his 4 consecutive Open Championships. Tragically died at just 24 years old." },
        { record: "Most Masters Victories", value: "6", holder: "Jack Nicklaus", detail: "Won in 1963, 1965, 1966, 1972, 1975, and — unforgettably — 1986 at age 46, the oldest Masters champion ever." },
        { record: "Career Grand Slam (Men)", value: "6 players", holder: "Sarazen, Hogan, Player, Nicklaus, Woods, McIlroy", detail: "Only six men have won all four major championships in their career. McIlroy completed his in 2025 at The Masters." },
        { record: "Most Consecutive Major Wins", value: "4 (Tiger Slam)", holder: "Tiger Woods (2000-2001)", detail: "Woods held all four major trophies simultaneously after winning the 2001 Masters, completing the 'Tiger Slam' — though not in a calendar year." },

        /* ═══ PGA TOUR RECORDS ═══ */
        { record: "Most PGA Tour Wins (Career)", value: "82", holder: "Tiger Woods (tied with Sam Snead)", detail: "Tiger won his 82nd title at the 2019 Zozo Championship in Japan." },
        { record: "Most Consecutive PGA Tour Wins", value: "11", holder: "Byron Nelson (1945)", detail: "Won 11 straight and 18 total that season. The 'Iron Byron' testing machine was named after his mechanically consistent swing." },
        { record: "Most PGA Tour Wins (Season)", value: "18", holder: "Byron Nelson (1945)", detail: "An untouchable record. In the modern era (post-1945), Tiger Woods holds it with 9 wins in 2000." },
        { record: "Most Consecutive Cuts Made", value: "142", holder: "Tiger Woods (1998–2005)", detail: "Made the cut in every tournament for 7+ years straight. Incredible consistency." },
        { record: "Most Consecutive Years with a PGA Tour Win", value: "17", holder: "Jack Nicklaus (1962-1978) & Arnold Palmer (1955-1971)", detail: "Both legends won at least one PGA Tour event for 17 consecutive seasons." },
        { record: "Most Wins Before Age 25", value: "34", holder: "Tiger Woods", detail: "Woods was winning at a rate unseen since Byron Nelson. By 24, he'd already won 6 majors." },

        /* ═══ DISTANCE & PHYSICAL RECORDS ═══ */
        { record: "Longest Drive (Competition)", value: "515 yards", holder: "Mike Austin (1974 US Senior Open qualifier)", detail: "Hit with a persimmon wood (ancient technology!) with a strong tailwind." },
        { record: "Longest Putt Made (PGA Tour)", value: "110 feet", holder: "Brad Faxon (2005)", detail: "Most long putts on Tour are 50-80 feet. This was beyond extraordinary." },
        { record: "Most Holes-in-One (Lifetime)", value: "59", holder: "Norman Manley", detail: "Recorded between 1964 and 2014. That averages more than one per year for 50 years!" },
        { record: "Longest Hole-in-One", value: "517 yards", holder: "Robert Mitera (1965, Miracle Hills GC)", detail: "On a downhill, downwind par 4 in Omaha, Nebraska. The ball rolled over 300 yards after landing." },
        { record: "Fastest Golf Round (18 holes)", value: "27 min 9 sec", holder: "James Carvill (2013, Warrenpoint GC)", detail: "Carvill ran between shots to complete the round. He shot 81 — not bad considering the pace!" },

        /* ═══ RYDER CUP RECORDS ═══ */
        { record: "Most Ryder Cup Points (Career)", value: "28½", holder: "Sergio García", detail: "The Spaniard accumulated 28½ points across his Ryder Cup career with a 25-13-7 record." },
        { record: "Most Ryder Cup Appearances", value: "12", holder: "Phil Mickelson (USA)", detail: "Lefty represented the United States in 12 Ryder Cups from 1995 through 2018." },
        { record: "Most Ryder Cup Appearances (Europe)", value: "11", holder: "Nick Faldo", detail: "Faldo represented Europe/Great Britain 11 times and contributed 25 points — second all-time." },
        { record: "Largest Ryder Cup Singles Comeback", value: "4 points", holder: "Europe (2012 Medinah)", detail: "Europe trailed 10-6 after Saturday but won the singles 8½-3½ for one of sport's greatest comebacks." },

        /* ═══ WOMEN'S & LPGA RECORDS ═══ */
        { record: "Most LPGA Tour Wins (Career)", value: "88", holder: "Kathy Whitworth", detail: "More professional wins than any golfer — male or female — in history. She never won the U.S. Women's Open, her only 'missing' major." },
        { record: "Most LPGA Major Wins (Career)", value: "15", holder: "Patty Berg", detail: "Won in the earliest years of women's professional golf. Mickey Wright's 13 majors are second all-time." },
        { record: "Most LPGA Wins in a Season", value: "13", holder: "Mickey Wright (1963)", detail: "Wright was so dominant that Ben Hogan once said she had the best golf swing he'd ever seen — male or female." },
        { record: "Youngest World #1 (LPGA)", value: "17 years, 9 months", holder: "Lydia Ko (2015)", detail: "The New Zealand prodigy became the youngest golfer of either gender to reach #1 in the world rankings." },

        /* ═══ AMATEUR & MISCELLANEOUS RECORDS ═══ */
        { record: "Oldest Hole-in-One", value: "103 years old", holder: "Gus Andreone (2021)", detail: "Made his ace at the age of 103 on a 113-yard hole at Palm Aire Country Club in Sarasota, Florida." },
        { record: "Most Career Aces (Professional)", value: "10", holder: "Hal Sutton", detail: "Most PGA Tour pros go their entire career with just 1-3 aces. Sutton's 10 is extraordinary." },
        { record: "Lowest Round by an Amateur (Major)", value: "63", holder: "Multiple amateurs", detail: "Several amateurs have shot 63 in a major round, but none has won a major since Bobby Jones in 1930." },
        { record: "Most Expensive Golf Course Built", value: "$1.2 billion+", holder: "Shadow Creek (Las Vegas)", detail: "Steve Wynn spent over $1.2 billion (adjusted for inflation) to build Shadow Creek in the Nevada desert — transforming flat desert into a lush paradise." }
    ]
};
