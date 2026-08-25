/* =========================================================
   CourseCompass — Lessons / Golf Academy Module
   Comprehensive lessons from beginner to pro level
   ========================================================= */

const Lessons = {

    currentLevel: 'beginner',

    /* ── All Lessons Data ───────────────────────────────── */
    data: {
        beginner: [
            {
                id: "b1",
                title: "What Is Golf? The Basics Explained",
                content: `
                    <h4>The Big Picture</h4>
                    <p>Golf is a game where you hit a small ball with a club from a starting point (the <strong>tee</strong>) into a hole in the ground (the <strong>cup</strong>) in as few hits (called <strong>strokes</strong>) as possible. That's the whole game! Simple, right?</p>
                    
                    <h4>The Course</h4>
                    <p>A golf course has <strong>18 holes</strong> (or sometimes 9 for a shorter game). Each hole is a separate mini-course with its own challenges. The whole course is like a big park — usually about 100-200 acres of beautiful land.</p>
                    <p>Each hole has these parts:</p>
                    <ul>
                        <li><strong>Tee Box</strong> — where you start. You get to put your ball on a little wooden peg (a tee) for your first shot.</li>
                        <li><strong>Fairway</strong> — the nicely mowed path to the green. This is where you WANT your ball to be.</li>
                        <li><strong>Rough</strong> — the taller, thicker grass on the sides. Harder to hit from — a penalty for missing the fairway.</li>
                        <li><strong>Bunkers (Sand Traps)</strong> — holes filled with sand. Tricky to escape from!</li>
                        <li><strong>Water Hazards</strong> — ponds, lakes, or streams. If your ball goes in, you get a penalty stroke.</li>
                        <li><strong>Green</strong> — the super smooth, super short grass around the hole where you putt.</li>
                        <li><strong>The Hole</strong> — 4.25 inches in diameter, with a flagstick so you can see it from far away.</li>
                    </ul>
                    
                    <h4>How Scoring Works</h4>
                    <p>Each hole has a <strong>par</strong> — the number of strokes a good player should take. Most holes are par 3 (short), par 4 (medium), or par 5 (long). A full 18-hole course usually adds up to par 70, 71, or 72.</p>
                    <p>Your goal: take as FEW strokes as possible. Lower is better in golf! If a hole is par 4 and you finish in 3 strokes, that's 1 under par (called a <strong>birdie</strong>). If you take 5 strokes, that's 1 over par (a <strong>bogey</strong>).</p>
                    
                    <div class="tip-box">💡 <strong>Remember:</strong> In golf, unlike most sports, the LOWEST score wins!</div>
                `
            },
            {
                id: "b2",
                title: "Your Golf Bag: Understanding the Clubs",
                content: `
                    <h4>The Rules Allow You 14 Clubs Maximum</h4>
                    <p>You can carry up to 14 clubs in your bag. Each club is designed for a different distance and situation. Think of them like tools in a toolbox — you wouldn't use a hammer to turn a screw!</p>
                    
                    <h4>The Four Types of Clubs</h4>
                    <ul>
                        <li><strong>🏌️ Woods (Driver, 3-Wood, 5-Wood)</strong> — The biggest clubs. They go the FARTHEST. The driver is the king of distance — used for the first shot on long holes.</li>
                        <li><strong>⚙️ Irons (3-9 Iron)</strong> — Medium-length clubs. The lower the number, the farther it goes. A 5-iron goes much farther than a 9-iron.</li>
                        <li><strong>🔧 Wedges (PW, GW, SW, LW)</strong> — Short-distance, high-accuracy clubs. Used close to the green to pop the ball up high so it lands softly.</li>
                        <li><strong>🏑 Putter</strong> — Used on the green to roll the ball into the hole. You'll use this more than any other club!</li>
                    </ul>
                    
                    <h4>The Simple Rule</h4>
                    <p>Lower club number = lower ball flight + more distance. Higher club number = higher ball flight + less distance. A 5-iron goes low and far. A 9-iron goes high and short.</p>
                    
                    <h4>What Should a Beginner Carry?</h4>
                    <p>You don't need all 14 clubs to start! A beginner set of 7-8 clubs is perfect:</p>
                    <ul>
                        <li>Driver (for tee shots)</li>
                        <li>5-Wood or Hybrid (for long fairway shots)</li>
                        <li>7-Iron (the most important club to learn with)</li>
                        <li>9-Iron (for shorter approach shots)</li>
                        <li>Pitching Wedge (for close-range shots)</li>
                        <li>Sand Wedge (for bunkers and high shots)</li>
                        <li>Putter (essential for every hole)</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Pro Tip:</strong> The 7-iron is the best club to learn the golf swing with. If you can hit a 7-iron well, you can hit anything!</div>
                `
            },
            {
                id: "b3",
                title: "The Grip: How to Hold a Golf Club",
                content: `
                    <h4>Why the Grip Matters So Much</h4>
                    <p>Your hands are the ONLY part of your body touching the club. Everything about your shot — direction, power, control — flows through your grip. It's the foundation of your entire game.</p>
                    
                    <h4>Step-by-Step Grip Guide (for Right-Handed Players)</h4>
                    <ol>
                        <li><strong>Left Hand First:</strong> Place the club handle diagonally across your left palm, from the base of your pinky finger to the middle of your index finger. Wrap your fingers around it.</li>
                        <li><strong>Left Thumb:</strong> Place it slightly to the right side of the shaft (not straight on top). You should see 2-3 knuckles of your left hand when you look down.</li>
                        <li><strong>Right Hand:</strong> Place it below your left hand. The lifeline (fleshy pad) of your right palm should cover your left thumb.</li>
                        <li><strong>Right Fingers:</strong> Wrap them around the club. Your right pinky connects to your left hand in one of three styles (see below).</li>
                    </ol>
                    
                    <h4>Three Grip Styles</h4>
                    <ul>
                        <li><strong>Overlapping (Vardon) Grip</strong> — Right pinky rests ON TOP of the gap between your left index and middle finger. Most popular among pros. ⭐ RECOMMENDED for most players.</li>
                        <li><strong>Interlocking Grip</strong> — Right pinky interLOCKS with your left index finger (like crossing fingers). Used by Jack Nicklaus and Tiger Woods. Good for smaller hands.</li>
                        <li><strong>Ten-Finger (Baseball) Grip</strong> — All 10 fingers on the club, no overlapping. Easiest to learn. Great for beginners, juniors, and players with hand/wrist issues.</li>
                    </ul>
                    
                    <h4>Grip Pressure</h4>
                    <p>On a scale of 1-10 (where 10 is squeezing as hard as possible), your grip should be about a <strong>4 or 5</strong>. Think of holding a tube of toothpaste without any coming out. Firm enough to control the club, relaxed enough to let it swing freely.</p>
                    
                    <div class="warning-box">⚠️ <strong>Common Mistake:</strong> Gripping too tight! This causes tension in your arms and shoulders, which slows your swing and makes you less accurate. Relax those hands!</div>
                    
                    <div class="drill-box">🎯 <strong>Practice Drill:</strong> Hold the club with your normal grip, then have a friend try to pull it out of your hands. They should be able to twist it a little but not pull it away. That's the right pressure!</div>
                `
            },
            {
                id: "b4",
                title: "Stance & Setup: Your Foundation",
                content: `
                    <h4>Why Setup Matters</h4>
                    <p>Imagine trying to throw a ball while standing on one foot on a slope — it wouldn't work well! Your setup is your foundation. A great setup makes a great swing much easier. A bad setup makes a good swing almost impossible.</p>
                    
                    <h4>The Perfect Stance: Step by Step</h4>
                    <ol>
                        <li><strong>Foot Width:</strong> For a mid-iron, your feet should be shoulder-width apart. Wider for the driver, narrower for wedges.</li>
                        <li><strong>Foot Position:</strong> Both feet should point slightly outward (about 10-15 degrees). Your left foot (lead foot) can flare out a bit more to help you rotate through the swing.</li>
                        <li><strong>Knee Flex:</strong> Slightly bent — like you're about to sit on a bar stool. Athletic and balanced. NOT squatting deep or standing stiff.</li>
                        <li><strong>Spine Angle:</strong> Bend forward from your HIPS (not your waist). Your back should be relatively straight, not curved. Imagine a straight line from your head to your tailbone.</li>
                        <li><strong>Arm Position:</strong> Let your arms hang naturally. Don't reach for the ball or pull them in close. The club should reach the ground without stretching.</li>
                        <li><strong>Weight Distribution:</strong> 50/50 between your feet. For the driver, you can put slightly more weight on your back foot (55/45).</li>
                    </ol>
                    
                    <h4>Ball Position</h4>
                    <p>Where the ball sits between your feet CHANGES based on the club:</p>
                    <ul>
                        <li><strong>Driver:</strong> Off your front heel (left heel for righties)</li>
                        <li><strong>Fairway Woods:</strong> About 2 inches back from the driver position</li>
                        <li><strong>Mid-Irons (5-7):</strong> Center of your stance</li>
                        <li><strong>Short Irons/Wedges:</strong> Slightly back of center</li>
                    </ul>
                    
                    <h4>Alignment</h4>
                    <p>Your feet, hips, and shoulders should all be parallel to your target line — like a train on railroad tracks. The ball is on one track, your body is on the other. They point the same direction but don't overlap.</p>
                    
                    <div class="drill-box">🎯 <strong>Practice Drill:</strong> Lay two clubs on the ground parallel to each other — one pointing at your target (for the ball), one at your toes. This is the most important drill you can do. Use it EVERY time you practice.</div>
                `
            },
            {
                id: "b5",
                title: "The Golf Swing: Making It Simple",
                content: `
                    <h4>The Swing in 4 Simple Parts</h4>
                    <p>The golf swing looks complicated, but it's really just four movements connected into one smooth motion. Think of it like a dance move — once you know the steps, you put them together.</p>
                    
                    <h4>Part 1: The Takeaway (Starting the Backswing)</h4>
                    <p>Keep the club, hands, and arms moving TOGETHER as one piece for the first 12 inches. Don't just pick the club up with your hands — turn your shoulders to start the swing. Imagine your left shoulder moving toward your chin.</p>
                    
                    <h4>Part 2: The Backswing (Going Up)</h4>
                    <p>Continue turning your shoulders until your back faces the target. Your weight shifts to your back foot. Your left arm stays relatively straight. At the top, the club should be roughly parallel to the ground (don't worry about being perfect).</p>
                    <ul>
                        <li>Your left shoulder should be under your chin</li>
                        <li>About 60-70% of your weight is on your back foot</li>
                        <li>Your hips have turned about 45 degrees</li>
                        <li>You should feel wound up, like a spring ready to release</li>
                    </ul>
                    
                    <h4>Part 3: The Downswing (Coming Down)</h4>
                    <p>THIS IS WHERE THE MAGIC HAPPENS. Start the downswing with your LOWER BODY — shift your hips toward the target, then your arms follow. Think: <strong>"Hips first, then hands."</strong> The club naturally drops into the right position.</p>
                    <p>The biggest mistake beginners make is starting the downswing with their arms. Let your body lead!</p>
                    
                    <h4>Part 4: The Follow-Through (After Contact)</h4>
                    <p>After hitting the ball, keep rotating! Your belly button faces the target, your weight is on your front foot, and you can balance on your back toe. A good finish position means you swung through the ball properly.</p>
                    
                    <div class="tip-box">💡 <strong>The Secret:</strong> Swing at 80% power. Seriously. A smooth, controlled swing hits the ball farther and straighter than an all-out smash. "Swing easy, hit hard" is the most important phrase in golf.</div>
                    
                    <div class="drill-box">🎯 <strong>Practice Drill:</strong> Make practice swings with your feet together (touching). This forces you to swing in balance. If you fall over, you're swinging too hard. Gradually widen your stance as you get comfortable.</div>
                `
            },
            {
                id: "b6",
                title: "Putting: The Most Important Skill",
                content: `
                    <h4>Why Putting Is King</h4>
                    <p>About <strong>40% of all your strokes</strong> are putts. If you play a par-72 course and take 36 putts, that's HALF your total score! Improving your putting is the fastest way to lower your scores.</p>
                    
                    <h4>The Putting Setup</h4>
                    <ul>
                        <li><strong>Stance:</strong> Feet shoulder-width or slightly narrower. Weight slightly favoring your front foot (55/45).</li>
                        <li><strong>Eyes:</strong> Directly over the ball or slightly inside. Drop a ball from between your eyes to check — it should land on or just inside your ball.</li>
                        <li><strong>Grip:</strong> Many putting grips work. The most common: palms face each other, both thumbs straight down the flat top of the putter grip.</li>
                        <li><strong>Ball Position:</strong> Slightly forward of center in your stance.</li>
                    </ul>
                    
                    <h4>The Putting Stroke</h4>
                    <p>Think of a <strong>pendulum</strong> — like a grandfather clock. Your shoulders rock back and forth while your hands, wrists, and arms stay in the same position relative to your body. NO wrist flipping or hand action!</p>
                    <ol>
                        <li>Rock your shoulders to take the putter back</li>
                        <li>Rock them forward through the ball</li>
                        <li>The backstroke and forward stroke should be roughly the same length</li>
                        <li>Accelerate THROUGH the ball — never decelerate</li>
                    </ol>
                    
                    <h4>Reading Greens</h4>
                    <p>Greens aren't flat! They have slopes that make the ball curve (called <strong>break</strong>). Here's how to read them:</p>
                    <ul>
                        <li>Walk around your putt and look at it from all sides</li>
                        <li>Pay attention to the overall slope — water flows downhill, and so does your ball</li>
                        <li>Crouch down behind the ball and look toward the hole for the best read</li>
                        <li>Look at the area around the hole — the ball slows down near the hole and breaks MORE at the end</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Speed is more important than line.</strong> Most 3-putts happen because of BAD SPEED, not bad direction. Focus on getting the distance right, and the direction will take care of itself.</div>
                    
                    <div class="drill-box">🎯 <strong>Practice Drill (The Gate Drill):</strong> Place two tees just wider than your putter head, about 2 feet from the hole. Practice putting through the gate. This builds a straight, consistent stroke.</div>
                `
            },
            {
                id: "b7",
                title: "Golf Etiquette: The Unwritten Rules",
                content: `
                    <h4>Why Etiquette Matters</h4>
                    <p>Golf is a game built on honor, respect, and sportsmanship. There's no referee watching — you call penalties on yourself! Good etiquette makes the game enjoyable for everyone.</p>
                    
                    <h4>The Golden Rules of Golf Etiquette</h4>
                    <ol>
                        <li><strong>Be QUIET when someone is hitting.</strong> No talking, no moving, no rustling your bag. Stand still and out of their line of sight.</li>
                        <li><strong>Yell "FORE!" immediately if your ball is heading toward anyone.</strong> This is a SAFETY issue. Don't be embarrassed — be loud!</li>
                        <li><strong>Repair your divots.</strong> When your iron cuts a chunk of grass, replace it or fill the hole with the sand/seed mix provided on the cart.</li>
                        <li><strong>Fix ball marks on the green.</strong> When your ball lands on the green, it leaves a little dent. Use a repair tool to smooth it out. This keeps the green smooth for everyone.</li>
                        <li><strong>Rake bunkers after you play from them.</strong> Smooth out your footprints and the area where your club hit the sand.</li>
                        <li><strong>Keep pace of play.</strong> Don't take too long! Be ready to hit when it's your turn. A round should take about 4 to 4.5 hours for 18 holes.</li>
                        <li><strong>Let faster groups play through.</strong> If you're slow and the group behind is waiting, wave them through on a par 3. No ego about it!</li>
                        <li><strong>Don't walk in someone's putting line.</strong> The path between a player's ball and the hole is their "line." Walk around it, never through it.</li>
                        <li><strong>Turn off your phone or put it on silent.</strong> Nobody wants to hear your ringtone during their backswing.</li>
                        <li><strong>Shake hands after the round.</strong> Win or lose, thank your playing partners and compliment their good shots.</li>
                    </ol>
                    
                    <div class="tip-box">💡 <strong>The Spirit of Golf:</strong> Call penalties on yourself, congratulate good shots by others, and treat the course with respect. This is what makes golf special.</div>
                `
            },
            {
                id: "b8",
                title: "Rules of Golf: The Essentials",
                content: `
                    <h4>You Don't Need to Know Every Rule</h4>
                    <p>The official rule book is 200+ pages long, but you only need to know about 10 rules to play a casual round. Here are the essentials:</p>
                    
                    <h4>Key Rules Every Golfer Must Know</h4>
                    <ol>
                        <li><strong>Play the Ball as It Lies:</strong> Don't move your ball. Hit it from where it stopped. This is the most fundamental rule in golf.</li>
                        <li><strong>Tee Box Rules:</strong> You must tee off between the tee markers, or up to two club-lengths behind them. Never in front.</li>
                        <li><strong>Out of Bounds (OB):</strong> Marked by white stakes. If your ball goes OB, you take a one-stroke penalty and hit again from the same spot. (Stroke and distance penalty.)</li>
                        <li><strong>Water Hazards (Penalty Areas):</strong> Marked by yellow or red stakes. If your ball goes in water: Yellow stakes = play from where you last hit (one-stroke penalty). Red stakes = you can also drop within 2 club-lengths from where it crossed the hazard line (one-stroke penalty).</li>
                        <li><strong>Unplayable Lie:</strong> If your ball is in a spot you can't play from (like stuck in a bush), take a one-stroke penalty and either: go back to where you hit from, drop within 2 club-lengths (no closer to the hole), or go back on a line from the hole through where the ball was.</li>
                        <li><strong>Lost Ball:</strong> You have 3 minutes to find your ball. If you can't find it, it's lost — same penalty as OB (stroke and distance).</li>
                        <li><strong>Provisional Ball:</strong> If you think your ball might be lost or OB, you can hit a "provisional" ball to save time walking back. Announce "I'm hitting a provisional" before you hit it.</li>
                        <li><strong>Free Relief:</strong> You get free drops (no penalty) from: cart paths, ground under repair (marked GUR), immovable obstructions (sprinklers, benches), and casual water (puddles).</li>
                        <li><strong>The Putting Green:</strong> You can mark your ball, clean it, and replace it. You can remove loose impediments (leaves, twigs) on the green. You can leave the flagstick in or take it out — your choice.</li>
                        <li><strong>Count ALL Strokes:</strong> Including whiffs (swinging and missing), penalty strokes, and provisional balls when the original is lost.</li>
                    </ol>
                    
                    <div class="warning-box">⚠️ <strong>Penalty Summary:</strong> Most penalties are 1 stroke (water hazard, unplayable lie) or stroke-and-distance (OB, lost ball). Disqualification penalties are rare and for serious violations.</div>
                `
            }
        ],

        intermediate: [
            {
                id: "i1",
                title: "Shot Shaping: Draws and Fades",
                content: `
                    <h4>Why Shape Your Shots?</h4>
                    <p>Straight shots are great, but the ability to curve the ball intentionally gives you superpowers on the course. Need to go around a tree? Curve it. Need to fight the wind? Curve into it. This is where golf gets really fun.</p>
                    
                    <h4>The Draw (Right to Left for Righties)</h4>
                    <p>A draw curves gently from right to left. It's the preferred shot of many pros because it tends to roll farther after landing.</p>
                    <ul>
                        <li><strong>Setup:</strong> Aim your body (feet, hips, shoulders) slightly to the RIGHT of your target</li>
                        <li><strong>Clubface:</strong> Point the clubface AT your target (slightly closed relative to your body line)</li>
                        <li><strong>Swing:</strong> Swing along your body line (to the right). The closed clubface creates right-to-left spin</li>
                        <li><strong>Feel:</strong> Like you're swinging out to right field in baseball, with the club rolling over slightly through impact</li>
                    </ul>
                    
                    <h4>The Fade (Left to Right for Righties)</h4>
                    <p>A fade curves gently from left to right. It tends to land softer with less roll — great for approach shots that need to stop on the green.</p>
                    <ul>
                        <li><strong>Setup:</strong> Aim your body slightly to the LEFT of your target</li>
                        <li><strong>Clubface:</strong> Point the clubface AT your target (slightly open relative to your body line)</li>
                        <li><strong>Swing:</strong> Swing along your body line (to the left). The open clubface creates left-to-right spin</li>
                        <li><strong>Feel:</strong> Like you're holding off the club through impact, keeping the face slightly open</li>
                    </ul>
                    
                    <h4>The Key Principle</h4>
                    <p><strong>The clubface determines where the ball STARTS. The swing path relative to the face determines which way it CURVES.</strong> This is the most important concept in shot-shaping.</p>
                    
                    <div class="drill-box">🎯 <strong>Practice Drill:</strong> Place a headcover 20 yards ahead and slightly right. Try to start the ball at it with a draw so it curves back to your target. Then do the opposite with a fade. Start with a 7-iron and half-swings.</div>
                `
            },
            {
                id: "i2",
                title: "Short Game Mastery: Chipping & Pitching",
                content: `
                    <h4>The Scoring Zone</h4>
                    <p>More than 60% of all shots in a round are hit from within 100 yards of the hole. This is where you save strokes (or waste them). Master the short game and watch your scores plummet.</p>
                    
                    <h4>Chipping (Low Shot, Lots of Roll)</h4>
                    <p>Used when: you're just off the green with plenty of green between you and the hole.</p>
                    <ul>
                        <li>Narrow stance, weight 60-70% on your front foot</li>
                        <li>Ball position: back of center</li>
                        <li>Hands ahead of the ball at setup AND at impact</li>
                        <li>Use a putting stroke — shoulders rock, wrists stay quiet</li>
                        <li>The ball pops up briefly, then rolls most of the way to the hole</li>
                        <li>Club selection: 7-iron through pitching wedge depending on how far you need the ball to roll</li>
                    </ul>
                    
                    <h4>The Landing Spot Method</h4>
                    <p>Instead of looking at the hole, pick a <strong>landing spot</strong> on the green where you want the ball to first bounce. Then let it roll to the hole. This is WAY more reliable than trying to guess the total flight + roll.</p>
                    
                    <h4>Pitching (Higher Shot, Less Roll)</h4>
                    <p>Used when: you need the ball to fly over something (bunker, rough) or stop quickly.</p>
                    <ul>
                        <li>Wider stance than chipping, weight still slightly forward</li>
                        <li>Ball position: center to slightly forward</li>
                        <li>Make a mini-version of your full swing</li>
                        <li>Hinge your wrists on the backswing, let them release through impact</li>
                        <li>Matchup: backstroke length = follow-through length</li>
                        <li>Club selection: gap wedge, sand wedge, or lob wedge</li>
                    </ul>
                    
                    <h4>The Distance Control System</h4>
                    <p>Use a clock system for controlling pitch distances:</p>
                    <ul>
                        <li><strong>7 o'clock backswing</strong> = about 30% distance</li>
                        <li><strong>9 o'clock backswing</strong> (arms parallel to ground) = about 50% distance</li>
                        <li><strong>10 o'clock backswing</strong> = about 75% distance</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>The Rule of 12:</strong> For chip shots, divide 12 by the iron number to get the approximate carry-to-roll ratio. Example: 8-iron = 12÷8 ≈ 1.5 (the ball rolls 1.5 times the distance it flies).</div>
                `
            },
            {
                id: "i3",
                title: "Bunker Play: Escaping the Sand",
                content: `
                    <h4>The #1 Bunker Secret</h4>
                    <p><strong>You don't hit the ball — you hit the SAND.</strong> In a greenside bunker, your club never touches the ball directly. Instead, it slices through the sand underneath the ball, and the sand carries the ball out. Understanding this changes everything.</p>
                    
                    <h4>Greenside Bunker Technique</h4>
                    <ol>
                        <li><strong>Open the clubface BEFORE gripping:</strong> Rotate the sand wedge face open (pointing right), THEN take your grip. The open face uses the "bounce" (the bottom of the club) to glide through the sand instead of digging.</li>
                        <li><strong>Open your stance:</strong> Aim your feet and body about 20-30 degrees left of the target.</li>
                        <li><strong>Dig your feet in:</strong> Wiggle your feet into the sand for a stable base. This also tells you how deep/firm the sand is.</li>
                        <li><strong>Aim 2 inches behind the ball:</strong> Draw a line in the sand 2 inches behind the ball. That's where the club enters the sand.</li>
                        <li><strong>Swing along your body line (left of target):</strong> Make a full, aggressive swing. The open face + open stance combination gets the ball going right (toward the target) even though you swing left.</li>
                        <li><strong>DON'T DECELERATE:</strong> This is the biggest mistake. Commit to a full follow-through. Splash the sand onto the green — the ball rides out on a cushion of sand.</li>
                    </ol>
                    
                    <h4>Fairway Bunker Technique (Different!)</h4>
                    <p>In a fairway bunker, you DO want to hit the ball first (not the sand). It's more like a normal iron shot with some adjustments:</p>
                    <ul>
                        <li>Dig feet in slightly for stability</li>
                        <li>Grip down about 1 inch on the club to compensate</li>
                        <li>Ball position center or slightly back</li>
                        <li>Swing at 75% power — focus on clean, ball-first contact</li>
                        <li>Take one MORE club than normal (9-iron instead of PW) as you'll lose some distance</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Sand Type Matters:</strong> In soft, fluffy sand, use MORE bounce (open the face more). In hard, wet, or compact sand, use LESS bounce (keep the face more square) to prevent the club from bouncing off the hard surface into the ball.</div>
                `
            },
            {
                id: "i4",
                title: "Course Management: Playing Smart",
                content: `
                    <h4>What Is Course Management?</h4>
                    <p>Course management is your STRATEGY — the decisions you make before every shot. It's the chess game within golf. The best course managers shoot lower scores even with inferior ball-striking. Brains beat brawn.</p>
                    
                    <h4>The Big Principles</h4>
                    <ol>
                        <li><strong>Aim for the fat part of the green.</strong> Most amateurs should aim for the CENTER of the green, not the pin. A ball on the center of the green is always better than one in the bunker by a pin tucked on the edge.</li>
                        <li><strong>Miss on the right side.</strong> Before every shot, decide: "If I miss, WHERE is the safest miss?" Then aim to make that miss less costly.</li>
                        <li><strong>Play to your strengths.</strong> If you hit a reliable fade, plan your tee shots around that shape. Don't try to hit a draw just because the hole curves left.</li>
                        <li><strong>Distance control > direction.</strong> Most shots that miss the green miss SHORT, not long. Take enough club! If you're between clubs, take the LONGER one.</li>
                        <li><strong>Par is your friend.</strong> On hard holes, make par your goal. Save your aggressive plays for shorter, easier holes where birdie is realistic.</li>
                    </ol>
                    
                    <h4>Tee Shot Strategy</h4>
                    <ul>
                        <li>You don't always need the driver. An iron or hybrid that stays in the fairway beats a driver in the trees every time.</li>
                        <li>Tee up on the side of the tee box where the trouble is, then aim away from it. This gives you the widest angle.</li>
                        <li>On dogleg holes, don't try to cut the corner unless you're very confident. Play to the bend and take a longer approach.</li>
                    </ul>
                    
                    <h4>The 3-Putt Killer Strategy</h4>
                    <p>On long putts (30+ feet), focus on SPEED, not line. If you get the speed right, even if the direction is off, you'll leave a short second putt. Try to get it within a 3-foot circle around the hole.</p>
                    
                    <div class="tip-box">💡 <strong>The 80/20 Rule:</strong> 80% of your scoring improvement comes from AVOIDING big mistakes, not from hitting spectacular shots. Eliminate double bogeys and you'll shave 5-10 strokes off your score.</div>
                `
            },
            {
                id: "i5",
                title: "Understanding Ball Flight Laws",
                content: `
                    <h4>The New Ball Flight Laws</h4>
                    <p>Modern launch monitors and high-speed cameras have revealed the truth about what makes the ball fly the way it does. Understanding these laws lets you self-diagnose and fix your shots.</p>
                    
                    <h4>Two Key Factors</h4>
                    <ol>
                        <li><strong>Clubface Angle at Impact:</strong> This determines where the ball STARTS. If the face points right, the ball starts right. Period. The face accounts for roughly 75-85% of the starting direction.</li>
                        <li><strong>Club Path (Swing Direction):</strong> The difference between the face angle and the path determines the CURVE. If the face is closed relative to the path, the ball curves left (draw). If open, it curves right (fade).</li>
                    </ol>
                    
                    <h4>The 9 Ball Flights</h4>
                    <p>Every shot is a combination of start direction (left, center, right) and curve (left, straight, right):</p>
                    <ul>
                        <li><strong>Straight:</strong> Face square, path square — rare but beautiful</li>
                        <li><strong>Draw:</strong> Face slightly closed to path — starts right, curves left</li>
                        <li><strong>Fade:</strong> Face slightly open to path — starts left, curves right</li>
                        <li><strong>Pull:</strong> Face left, path left — starts left, goes straight left</li>
                        <li><strong>Push:</strong> Face right, path right — starts right, goes straight right</li>
                        <li><strong>Hook:</strong> Face very closed to path — exaggerated draw, curves hard left</li>
                        <li><strong>Slice:</strong> Face very open to path — exaggerated fade, curves hard right</li>
                        <li><strong>Pull-Hook:</strong> Starts left and curves more left — double trouble</li>
                        <li><strong>Push-Slice:</strong> Starts right and curves more right — the dreaded banana ball</li>
                    </ul>
                    
                    <h4>How to Use This</h4>
                    <p>When you hit a bad shot, ask two questions:</p>
                    <ol>
                        <li>Where did the ball START? → That tells you about your clubface</li>
                        <li>Which way did it CURVE? → That tells you about your path relative to face</li>
                    </ol>
                    
                    <div class="tip-box">💡 <strong>Quick Fix Guide:</strong> Slicing? Your face is open to your path. Stop aiming further left (that just makes the path more out-to-in). Instead, work on closing the face through impact.</div>
                `
            },
            {
                id: "i6",
                title: "Distance Control: Dialing in Your Yardages",
                content: `
                    <h4>Know Your Numbers</h4>
                    <p>Professional golfers know EXACTLY how far each club goes. You should too. This is one of the biggest differences between intermediate and advanced players.</p>
                    
                    <h4>How to Chart Your Distances</h4>
                    <ol>
                        <li>Go to the range with a GPS or rangefinder</li>
                        <li>Hit 10 balls with each club (full swing, normal tempo)</li>
                        <li>Throw out the 2 longest and 2 shortest</li>
                        <li>Average the remaining 6 — that's your CARRY distance</li>
                        <li>Add 5-10 yards for roll to get your TOTAL distance</li>
                    </ol>
                    
                    <h4>The Three Distances for Each Club</h4>
                    <ul>
                        <li><strong>Full swing:</strong> Your normal, 100% swing distance</li>
                        <li><strong>Three-quarter swing:</strong> About 85% of full distance — VERY useful for in-between yardages</li>
                        <li><strong>Half swing:</strong> About 60% of full distance — great for controlled approach shots</li>
                    </ul>
                    
                    <h4>Creating Distance Gaps</h4>
                    <p>Ideally, you want about 10-15 yard gaps between each club. If you have big gaps, you might need to add another club. If clubs overlap in distance, you might remove one.</p>
                    
                    <div class="tip-box">💡 <strong>Real-World Tip:</strong> Most amateurs overestimate their distances by 10-20 yards. Be honest with yourself. Hitting a 7-iron 150 yards is perfectly fine — most recreational golfers do! Tour pros average 170-185 with a 7-iron, but they're the best in the world.</div>
                `
            }
        ],

        advanced: [
            {
                id: "a1",
                title: "The Mental Game: Playing Between the Ears",
                content: `
                    <h4>Golf Is 90% Mental</h4>
                    <p>Once you can hit the ball and know the fundamentals, the difference between good rounds and great rounds is almost entirely mental. Tiger Woods, Jack Nicklaus, and Annika Sörenstam were all legendary for their mental strength.</p>
                    
                    <h4>Pre-Shot Routine: Your Mental Trigger</h4>
                    <p>A consistent pre-shot routine puts your brain into "execution mode." It should take 15-30 seconds and be IDENTICAL before every shot:</p>
                    <ol>
                        <li>Stand behind the ball and pick your target</li>
                        <li>Visualize the shot (see the ball flying to the target)</li>
                        <li>Take one or two practice swings</li>
                        <li>Walk into your stance, align the clubface first, then set your body</li>
                        <li>One last look at the target, then pull the trigger</li>
                    </ol>
                    
                    <h4>Managing Emotions</h4>
                    <ul>
                        <li><strong>The 10-Second Rule:</strong> You have 10 seconds to be angry/frustrated after a bad shot. Get it out, then move on. By the time you walk to your next shot, you must be calm and focused.</li>
                        <li><strong>Process over outcome:</strong> Focus on making good DECISIONS, not good results. You can hit a perfect shot that hits a sprinkler and bounces into a pond. That's not your fault. Make good decisions and the scores will follow over time.</li>
                        <li><strong>Stay in the present:</strong> Don't think about the triple bogey on hole 5 when you're on hole 12. Each shot is independent. Give it your full attention.</li>
                        <li><strong>Embrace nerves:</strong> Nervousness on the first tee or on a crucial putt is NORMAL. It means you care. Reframe it as excitement, not fear. Take a deep breath, trust your routine, and commit.</li>
                    </ul>
                    
                    <h4>Visualization</h4>
                    <p>Before every shot, create a vivid mental picture of the ball doing exactly what you want — leaving the clubface, flowing through the air, landing, and rolling to the target. This programs your subconscious to execute. Studies show visualization can improve performance by 10-15%.</p>
                    
                    <div class="tip-box">💡 <strong>The Annika Method:</strong> Annika Sörenstam's "VISION54" philosophy believes every hole can be birdied — that's 54 strokes for 18 holes. It's not about being perfect; it's about believing every shot can be great. This mindset shift is powerful.</div>
                `
            },
            {
                id: "a2",
                title: "Specialty Shots: Expanding Your Arsenal",
                content: `
                    <h4>Punch Shot (Low Stinger)</h4>
                    <p>For getting under tree branches or into a headwind:</p>
                    <ul>
                        <li>Ball back in stance (right of center for righties)</li>
                        <li>Grip down 1-2 inches on the club</li>
                        <li>Three-quarter backswing, abbreviated follow-through</li>
                        <li>Hands stay ahead of the clubhead through impact</li>
                        <li>Keep your finish LOW — hands at chest height, not overhead</li>
                    </ul>
                    
                    <h4>Flop Shot</h4>
                    <p>A dramatic, high shot that goes almost straight up and stops dead. Use when you need to clear a bunker or obstacle with very little green to work with:</p>
                    <ul>
                        <li>Open the clubface WIDE (pointing almost at the sky)</li>
                        <li>Open your stance significantly (aim 30-45° left)</li>
                        <li>Ball forward in stance</li>
                        <li>Make a big, confident swing along your body line</li>
                        <li>The ball goes almost straight up and lands like a butterfly</li>
                    </ul>
                    
                    <div class="warning-box">⚠️ <strong>Danger Zone:</strong> The flop shot is HIGH RISK. If you catch it thin, the ball rockets across the green. Only use it when you absolutely must, and practice it extensively before trying it on the course.</div>
                    
                    <h4>Bump-and-Run</h4>
                    <p>A low-running shot played with an iron — the anti-flop. Incredibly reliable:</p>
                    <ul>
                        <li>Use a 7 or 8-iron</li>
                        <li>Set up like a putt (narrow stance, ball back)</li>
                        <li>Make a putting stroke</li>
                        <li>Ball stays low and rolls like a putt but from farther away</li>
                        <li>MUCH safer than a lob or pitch — this should be your default around the green</li>
                    </ul>
                    
                    <h4>Sidehill, Uphill, Downhill Lies</h4>
                    <ul>
                        <li><strong>Ball above your feet:</strong> Ball will curve left (draw). Aim right and grip down. Stand more upright.</li>
                        <li><strong>Ball below your feet:</strong> Ball will curve right (fade). Aim left. Bend more at the knees.</li>
                        <li><strong>Uphill lie:</strong> Ball will fly higher and shorter. Take more club. Set your shoulders parallel to the slope.</li>
                        <li><strong>Downhill lie:</strong> Ball will fly lower and longer. Take less club. Set shoulders parallel to the slope and swing WITH the slope.</li>
                    </ul>
                `
            },
            {
                id: "a3",
                title: "Reading Greens Like a Pro",
                content: `
                    <h4>Beyond the Basics</h4>
                    <p>At the advanced level, reading greens is an art form. Tour pros don't just look at the slope — they factor in grain, speed, moisture, time of day, and even the type of grass.</p>
                    
                    <h4>The AimPoint Method (Simplified)</h4>
                    <p>Tour pros use the AimPoint Express method to read greens with their feet:</p>
                    <ol>
                        <li>Stand at the mid-point of your putt, facing the hole</li>
                        <li>Feel the slope with your feet — which foot has more pressure?</li>
                        <li>Rate the slope on a scale of 1-5 (1 = barely noticeable, 5 = extreme)</li>
                        <li>Hold up 1-5 fingers (corresponding to the slope rating) at arm's length, centered on the hole</li>
                        <li>The outside edge of your fingers is your aim point</li>
                    </ol>
                    
                    <h4>Speed Reading Advanced Tips</h4>
                    <ul>
                        <li><strong>Uphill putts:</strong> The ball breaks LESS because it's rolling slower (gravity fights the break). Play less break but hit it firmer.</li>
                        <li><strong>Downhill putts:</strong> The ball breaks MORE because it's rolling slower at the end (gravity amplifies the break). Play more break and hit it softer.</li>
                        <li><strong>The last 3 feet matter most:</strong> The ball is slowest near the hole, so any slope near the hole has the biggest effect. Focus your read on the area around the hole.</li>
                        <li><strong>Double breaks:</strong> Some putts break one way then the other. Read each section separately.</li>
                    </ul>
                    
                    <h4>Grain Reading</h4>
                    <ul>
                        <li><strong>Shiny grass</strong> = you're looking downgrain (WITH the grain). Ball rolls faster.</li>
                        <li><strong>Dark/matte grass</strong> = you're looking into the grain. Ball rolls slower.</li>
                        <li><strong>Side grain:</strong> The grass grows toward the setting sun and toward water (drainage). This causes putts to break in the grain direction.</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Tour Secret:</strong> Walk to the low side of your putt. The best read always comes from below the hole looking up at the slope, not from above looking down.</div>
                `
            },
            {
                id: "a4",
                title: "Fitness & Flexibility for Golf Performance",
                content: `
                    <h4>The Modern Golf Athlete</h4>
                    <p>Today's professionals are athletes. Rory McIlroy, Jon Rahm, Nelly Korda — they all train like athletes. You don't need to bench press 300 pounds, but specific fitness improvements dramatically improve your golf game.</p>
                    
                    <h4>Key Areas to Develop</h4>
                    <ol>
                        <li><strong>Core Strength:</strong> Your core (abs, obliques, lower back) is the engine of the golf swing. Planks, Russian twists, and medicine ball rotational throws are gold.</li>
                        <li><strong>Hip Mobility:</strong> Restricted hips = restricted rotation = less power and more back pain. Hip circles, pigeon stretches, and 90/90 stretches daily.</li>
                        <li><strong>Thoracic Spine Rotation:</strong> This is the mid-back area. More rotation here = bigger shoulder turn = more power WITHOUT straining your lower back.</li>
                        <li><strong>Glute Strength:</strong> Your glutes drive power from the ground up. Squats, hip thrusts, and single-leg exercises.</li>
                        <li><strong>Forearm/Grip Strength:</strong> Strong forearms = better club control. Wrist curls and farmer's carries.</li>
                    </ol>
                    
                    <h4>Pre-Round Warm-Up (5 Minutes)</h4>
                    <ol>
                        <li>Arm circles — 10 each direction</li>
                        <li>Hip circles — 10 each direction</li>
                        <li>Torso rotations with a club across your shoulders — 20 total</li>
                        <li>Hamstring stretch — 15 seconds each leg</li>
                        <li>Practice swings: 5 half-speed, 5 three-quarter speed, 5 full speed</li>
                    </ol>
                    
                    <h4>Flexibility = Distance</h4>
                    <p>Research shows that increasing your shoulder turn by just 10 degrees can add 15-20 yards to your drive. Flexibility is the easiest and safest way to gain distance, especially as you age.</p>
                    
                    <div class="drill-box">🎯 <strong>Daily 5-Minute Routine:</strong> Cat-cow stretch (1 min), hip 90/90 (1 min each side), thoracic rotation (1 min), door frame chest stretch (30 sec each side). Do this every morning — your golf game will thank you.</div>
                `
            }
        ],

        pro: [
            {
                id: "p1",
                title: "Tournament Preparation & Strategy",
                content: `
                    <h4>The Week Before a Tournament</h4>
                    <p>Professional golfers don't just show up and play. Their prep starts days before the first ball is hit:</p>
                    <ol>
                        <li><strong>Course reconnaissance:</strong> Play at least 2-3 practice rounds. Note pin positions, green speeds, firmness, and trouble areas for each hole.</li>
                        <li><strong>Yardage book creation:</strong> Walk the course and note distances to hazards, layup points, and ideal landing zones. Mark sprinklers and permanent markers.</li>
                        <li><strong>Strategy map:</strong> For each hole, determine: ideal tee shot landing zone, target quadrant of the green for each pin position, and where you absolutely CANNOT miss.</li>
                        <li><strong>Equipment check:</strong> Ensure all 14 clubs are optimized for the course. Links course? Maybe add a 2-iron. Short course? Maybe carry 4 wedges.</li>
                        <li><strong>Green reading:</strong> Chart green slopes and speeds. Note the Stimpmeter reading and how the greens drain.</li>
                    </ol>
                    
                    <h4>In-Round Decision Making</h4>
                    <ul>
                        <li><strong>Commit fully to every shot.</strong> Indecision is the #1 killer. Pick your shot, pick your target, and fully commit. A committed swing to a slightly wrong target is better than an uncommitted swing to the perfect target.</li>
                        <li><strong>Manage your dispersion.</strong> Know your typical shot pattern (e.g., "my 7-iron lands within a 12-yard circle 80% of the time"). Aim so that even your MISS is safe.</li>
                        <li><strong>Score accumulation vs. hole-by-hole:</strong> Don't think about your overall score during the round. Play each hole as its own game. Nicklaus famously said he played "18 one-hole tournaments."</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Strokes Gained Thinking:</strong> Every decision should be evaluated by asking: "What gives me the best AVERAGE outcome?" Not the best possible result — the best average. This is how modern pros think about every shot.</div>
                `
            },
            {
                id: "p2",
                title: "Strokes Gained: The Data Revolution",
                content: `
                    <h4>What Is Strokes Gained?</h4>
                    <p>Strokes Gained is a statistical analysis developed by Professor Mark Broadie of Columbia University. It compares every shot you hit to the average tour player from the same position and tells you EXACTLY where you're gaining or losing strokes.</p>
                    
                    <h4>The Four Categories</h4>
                    <ol>
                        <li><strong>Strokes Gained: Off the Tee</strong> — How well you drive compared to the average. Includes distance AND accuracy.</li>
                        <li><strong>Strokes Gained: Approach</strong> — How well you hit shots into the green from 100+ yards. This is the category that correlates MOST strongly with overall scoring.</li>
                        <li><strong>Strokes Gained: Around the Green</strong> — Chipping, pitching, and bunker shots from inside 100 yards (not including putting).</li>
                        <li><strong>Strokes Gained: Putting</strong> — How well you putt compared to the average from each distance.</li>
                    </ol>
                    
                    <h4>Key Insights from Strokes Gained Data</h4>
                    <ul>
                        <li>Approach shots (100-200 yards) contribute more to scoring than any other category</li>
                        <li>The difference between the #1 and #100 putter on Tour is only about 0.5 strokes per round</li>
                        <li>Long game (tee shots + approach) accounts for roughly 65% of scoring variance</li>
                        <li>The best short game player gains about 1 stroke per round around the greens</li>
                    </ul>
                    
                    <h4>How to Apply This to Your Game</h4>
                    <p>Track your own stats for 10 rounds: fairways hit, greens in regulation, up-and-down percentage, and putts per round. Compare to scoring averages for your handicap level. Focus your practice on the category where you lose the MOST strokes.</p>
                `
            },
            {
                id: "p3",
                title: "Equipment Optimization & Club Fitting",
                content: `
                    <h4>Why Fitting Matters</h4>
                    <p>Playing with ill-fitted clubs is like running a marathon in the wrong shoe size. A proper fitting can improve your game by 3-5 strokes overnight. This isn't marketing — it's physics.</p>
                    
                    <h4>Key Fitting Parameters</h4>
                    <ul>
                        <li><strong>Club Length:</strong> Based on your height and wrist-to-floor measurement. Too long and you'll hit the toe; too short and you'll hit the heel.</li>
                        <li><strong>Lie Angle:</strong> The angle between the shaft and the ground. If your divots point left, your lie angle is too upright. Right = too flat.</li>
                        <li><strong>Shaft Flex:</strong> Based on your swing speed. Ladies (L), Senior (A), Regular (R), Stiff (S), Extra Stiff (X). Wrong flex = wayward shots.</li>
                        <li><strong>Shaft Weight:</strong> Lighter shafts = more speed but less control. Heavier = more control but less speed. Balance is key.</li>
                        <li><strong>Grip Size:</strong> Too small = overactive hands (hooks). Too large = underactive hands (slices). Measure your hand.</li>
                        <li><strong>Loft Gapping:</strong> Ensure your lofts create consistent 10-15 yard distance gaps between clubs.</li>
                        <li><strong>Launch Monitor Data:</strong> Ball speed, launch angle, spin rate, and carry distance for every club. Numbers don't lie.</li>
                    </ul>
                    
                    <h4>Wedge Fitting Specifics</h4>
                    <ul>
                        <li>Choose bounce based on your swing type: steep swings need high bounce (12°+), shallow swings can use low bounce (6-8°)</li>
                        <li>Choose grind based on the shots you play: wider sole for bunkers and soft conditions, narrower for firm conditions and versatility</li>
                        <li>Gap your wedges in 4° increments (e.g., 46°, 50°, 54°, 58°)</li>
                    </ul>
                    
                    <div class="tip-box">💡 <strong>Investment Tip:</strong> A $300 club fitting is worth more than a $3,000 set of clubs off the rack. Always get fitted. Most major golf retailers offer fittings — some are free with a club purchase.</div>
                `
            },
            {
                id: "p4",
                title: "Pressure Performance & Competition",
                content: `
                    <h4>Playing Under Pressure</h4>
                    <p>The ability to perform under pressure separates good players from great ones. Your heart races, your hands tingle, and that 3-foot putt suddenly looks like it's 30 feet. Here's how to master it.</p>
                    
                    <h4>Physiological Response Management</h4>
                    <ul>
                        <li><strong>Box Breathing:</strong> Inhale 4 seconds, hold 4 seconds, exhale 4 seconds, hold 4 seconds. This activates your parasympathetic nervous system and lowers your heart rate. Do it between shots.</li>
                        <li><strong>Progressive Muscle Relaxation:</strong> Squeeze your hands tight for 5 seconds, then release. Feel the relaxation flood your forearms. Now grip the club with that relaxed feeling.</li>
                        <li><strong>Power Posing:</strong> Stand tall, shoulders back, hands on hips for 30 seconds before the round. Studies show this increases confidence-related hormones by up to 20%.</li>
                    </ul>
                    
                    <h4>Mental Frameworks for Competition</h4>
                    <ol>
                        <li><strong>ACCEPTANCE:</strong> Accept that you'll hit bad shots. Even the best players hit bad shots every round. It's how you RESPOND that matters.</li>
                        <li><strong>COMMITMENT:</strong> Once you choose a shot, commit 100%. Post-decision doubt is poison. If you're not committed, step away and re-decide.</li>
                        <li><strong>FOCUS:</strong> Your attention should be on your process (routine, target, feel), NOT outcome (score, what others think, the trophy). Outcome focus creates anxiety; process focus creates flow state.</li>
                    </ol>
                    
                    <h4>Building Competitive Toughness</h4>
                    <p>Put pressure on yourself in practice: play games against yourself with consequences, practice under time pressure, putt with someone watching, play "worst ball" (play both shots and take the worse one). The more you practice under pressure, the more comfortable you'll be when it matters.</p>
                    
                    <div class="tip-box">💡 <strong>The Tiger Mentality:</strong> Tiger Woods once said: "The greatest thing about tomorrow is that I will be better than I am today." Champions believe in continuous improvement. Every round is a lesson, every mistake is data.</div>
                `
            }
        ]
    },

    /* ── Render Methods ─────────────────────────────────── */

    init() {
        this.bindLevelTabs();
        this.showRecommendedLevel();
    },

    showRecommendedLevel() {
        const level = globalThis.CourseCompassStore?.experienceProfile?.lessonLevel || 'beginner';
        this.currentLevel = this.data[level] ? level : 'beginner';
        document.querySelectorAll('.level-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.level === this.currentLevel));
        this.render(this.currentLevel);
    },

    bindLevelTabs() {
        document.querySelectorAll('.level-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentLevel = tab.dataset.level;
                this.render(this.currentLevel);
            });
        });
    },

    render(level) {
        const container = document.getElementById('lessonsContainer');
        if (!container) return;
        const lessons = this.data[level];
        if (!lessons) {
            container.innerHTML = '<p>No lessons available for this level yet.</p>';
            return;
        }
        container.innerHTML = lessons.map((lesson, idx) => `
            <div class="lesson-card" id="lesson-${lesson.id}">
                <div class="lesson-card-header" tabindex="0" role="button" aria-expanded="false" onclick="Lessons.toggleLesson('${lesson.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Lessons.toggleLesson('${lesson.id}');}">
                    <div class="lesson-title-group">
                        <div class="lesson-number">${idx + 1}</div>
                        <div class="lesson-title">${lesson.title}</div>
                    </div>
                    <div class="lesson-chevron">▼</div>
                </div>
                <div class="lesson-body">
                    ${this.cleanPresentation(lesson.content)}
                </div>
            </div>
        `).join('');
    },

    cleanPresentation(html) {
        return String(html || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '');
    },

    toggleLesson(id) {
        const card = document.getElementById(`lesson-${id}`);
        if (card) {
            card.classList.toggle('open');
            const header = card.querySelector('.lesson-card-header');
            if (header) header.setAttribute('aria-expanded', card.classList.contains('open'));
        }
    }
};
