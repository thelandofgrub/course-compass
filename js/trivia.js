/* =========================================================
   CourseCompass — Trivia & Fun Facts Module
   Interactive quiz, fun facts, golf records
   ========================================================= */

const Trivia = {

    currentTab: 'quiz',
    quizState: {
        questions: [],
        currentIndex: 0,
        score: 0,
        answered: false,
        total: 10
    },

    /* ── Quiz Questions Bank ────────────────────────────── */
    questionBank: [
        /* ═══ RULES & PENALTIES ═══ */
        { q: "What is the maximum number of clubs allowed in a golf bag during a round?", options: ["10", "12", "14", "16"], correct: 2, explanation: "The Rules of Golf allow a maximum of 14 clubs. You'll get a 2-stroke penalty per hole (up to 4 strokes) for carrying too many!" },
        { q: "What happens if your ball lands out of bounds (OB)?", options: ["Free drop", "One stroke penalty", "Two stroke penalty", "Stroke and distance penalty"], correct: 3, explanation: "Out of bounds results in a stroke-and-distance penalty. You add one penalty stroke AND must replay from where you last hit. It's one of the most costly penalties in golf." },
        { q: "How long do you have to search for a lost ball under the current rules?", options: ["1 minute", "3 minutes", "5 minutes", "10 minutes"], correct: 1, explanation: "Under the current Rules of Golf (updated in 2019), you have 3 minutes to search for a lost ball, reduced from the previous 5 minutes." },
        { q: "In 2019, what major rule change was made about the flagstick?", options: ["Must always be removed", "Must always stay in", "Players can choose to leave it in while putting", "It became shorter"], correct: 2, explanation: "Since 2019, golfers can putt with the flagstick still in the hole. Previously, hitting a flagstick while putting on the green was a 2-stroke penalty." },
        { q: "What is a 'mulligan'?", options: ["A certified penalty stroke", "A type of golf club", "An unofficial do-over shot", "A bunker shot technique"], correct: 2, explanation: "A mulligan is an informal, unofficial do-over. It's NOT in the official rules but is common in casual/friendly games. Most commonly used on the first tee!" },
        { q: "What does 'FORE!' mean on a golf course?", options: ["You're about to tee off", "Warning that a ball is heading toward someone", "The match is over", "You've scored under par"], correct: 1, explanation: "FORE! is a warning shout to alert people that a ball is heading their way. ALWAYS yell it when there's danger — it could prevent serious injury!" },
        { q: "What is a handicap in golf?", options: ["A physical limitation", "A numeric measure of a golfer's ability", "The course difficulty rating", "A type of penalty"], correct: 1, explanation: "A handicap is a number that represents your playing ability. It allows golfers of different skill levels to compete fairly against each other." },
        { q: "What is 'course rating'?", options: ["How beautiful the course is", "The difficulty for a scratch golfer", "The total par of the course", "The green speed"], correct: 1, explanation: "Course rating is a number (like 72.4) that indicates the expected score for a scratch golfer (handicap 0) under normal conditions." },
        { q: "What is the 'slope rating' of a golf course?", options: ["The steepness of the terrain", "How hard it is for bogey golfer vs scratch golfer", "The average grade of the fairways", "The speed of the greens"], correct: 1, explanation: "Slope Rating (55-155) measures the relative difficulty for a bogey golfer compared to a scratch golfer. 113 is average. Higher = harder for high-handicappers." },
        { q: "If your ball is in a water hazard, what are your options?", options: ["Only play it as it lies", "Take a drop with 1-stroke penalty", "Free drop anywhere", "Automatic 2-stroke penalty"], correct: 1, explanation: "In a penalty area (formerly water hazard), you can play it as it lies with no penalty, or take relief with a 1-stroke penalty by dropping behind the hazard on a line from the hole." },
        { q: "Can you repair spike marks on the putting green before your putt?", options: ["No, never", "Yes, since 2019", "Only with your putter", "Only in match play"], correct: 1, explanation: "Since the 2019 Rules of Golf modernization, you can repair ANY damage on the putting green, including spike marks, ball marks, and animal tracks. Previously, only ball marks were allowed." },
        { q: "What is the penalty for grounding your club in a bunker before your swing?", options: ["No penalty since 2019", "1 stroke", "2 strokes", "Disqualification"], correct: 2, explanation: "Touching the sand in a bunker with your club before the stroke is a 2-stroke penalty (or loss of hole in match play). However, since 2019, you CAN touch the sand in limited ways like leaning on a club for rest." },
        { q: "What does 'preferred lies' or 'winter rules' mean?", options: ["Golfers can lie about scores", "You can improve your lie in the fairway", "You must play in winter months", "A type of course rating"], correct: 1, explanation: "Preferred lies (also called 'winter rules') is a local rule that allows golfers to improve their lie in the fairway, typically by moving the ball up to 6 inches. It's used when course conditions are poor." },
        { q: "What is the penalty for accidentally moving your ball on the putting green?", options: ["2 strokes", "1 stroke", "No penalty — replace it", "Loss of hole"], correct: 2, explanation: "If you accidentally move your ball on the putting green, there is NO penalty — just replace it to its original spot. This rule was updated in 2019." },
        { q: "How many penalty strokes do you incur for hitting from a wrong tee?", options: ["None", "1 stroke", "2 strokes", "Disqualification"], correct: 2, explanation: "Playing from outside the teeing area is a 2-stroke penalty in stroke play (you must then replay from the correct tee). In match play, the opponent can ask you to replay the shot." },
        { q: "Can you take practice swings in a bunker?", options: ["Yes, anywhere", "No, never", "Yes, but don't touch the sand", "Only after your shot"], correct: 2, explanation: "You can take practice swings in a bunker, but you cannot touch the sand with your club during those practice swings. If you do, it's a 2-stroke penalty." },
        { q: "What is the 'provisonal ball' rule?", options: ["A spare ball you carry", "A ball played when original may be lost/OB", "A practice ball", "A ball used for warm-up"], correct: 1, explanation: "If you think your ball might be lost outside a penalty area or out of bounds, you can play a provisional ball to save time. If the original is found, you continue with it; if not, the provisional becomes your ball." },
        { q: "What happens if two golfers' balls collide on the green?", options: ["Both replay", "No penalty since 2019", "2-stroke penalty for both", "Only the first player is penalized"], correct: 1, explanation: "Since 2019, there is no penalty if balls collide on the putting green. Previously in stroke play, the player who putted was penalized 2 strokes. Now, both balls are simply replaced." },

        /* ═══ EQUIPMENT & TECHNOLOGY ═══ */
        { q: "Which club is typically used the most during a round of golf?", options: ["Driver", "7-Iron", "Putter", "Sand Wedge"], correct: 2, explanation: "The putter is used on every single hole! About 40% of all strokes in a round are putts." },
        { q: "How many dimples does a typical golf ball have?", options: ["150-200", "250-300", "300-500", "500-700"], correct: 2, explanation: "Most golf balls have between 300-500 dimples. The dimples create turbulence that reduces drag and helps the ball fly farther!" },
        { q: "What is the purpose of dimples on a golf ball?", options: ["Reduce air resistance", "Look pretty", "Help grip the club", "Make it easier to find"], correct: 0, explanation: "Dimples create a thin layer of turbulent air that clings to the ball's surface, dramatically reducing drag. A smooth ball would travel only about HALF as far!" },
        { q: "What is the 'sweet spot' on a golf club?", options: ["The handle", "The center of the clubface", "The bottom edge", "The toe of the club"], correct: 1, explanation: "The sweet spot is the ideal contact point at the center of the clubface. Hitting it produces maximum distance and accuracy with the best feel." },
        { q: "What is the purpose of 'bounce' on a wedge?", options: ["Helps the ball bounce higher", "Prevents the club from digging into ground/sand", "Creates more backspin", "Makes the ball curve"], correct: 1, explanation: "Bounce is the angle on the sole (bottom) of the wedge that prevents it from digging too deeply into the turf or sand. Higher bounce = more forgiveness in soft conditions." },
        { q: "How far does a typical amateur male golfer hit a driver?", options: ["150-180 yards", "200-230 yards", "260-290 yards", "300+ yards"], correct: 1, explanation: "The average amateur male drives about 200-230 yards. Tour pros average about 295 yards. There's a big gap — and that's okay!" },
        { q: "What is the standard weight limit for a golf ball?", options: ["1.42 oz", "1.52 oz", "1.62 oz", "1.72 oz"], correct: 2, explanation: "A golf ball must not weigh more than 1.62 ounces (45.93 grams) and must be at least 1.68 inches in diameter. The USGA and R&A test balls to ensure compliance." },
        { q: "What type of shaft is generally recommended for beginners?", options: ["Extra stiff steel", "Regular graphite", "Tour stiff", "Hickory"], correct: 1, explanation: "Beginners typically benefit from regular flex graphite shafts, which are lighter and more flexible, helping generate more clubhead speed and distance with less effort." },
        { q: "What is the 'loft' of a golf club?", options: ["The club's weight", "The angle of the clubface", "The length of the shaft", "The grip size"], correct: 1, explanation: "Loft is the angle of the clubface relative to vertical. Higher loft = higher, shorter shots. A driver has ~9-12° of loft, while a lob wedge has ~58-64°." },
        { q: "What does the 'MOI' of a golf club measure?", options: ["Moment of Impact", "Moment of Inertia", "Maximum Orbital Influence", "Minimum Operating Index"], correct: 1, explanation: "MOI stands for Moment of Inertia — it measures a clubhead's resistance to twisting on off-center hits. Higher MOI = more forgiving on mishits." },
        { q: "What is a 'hybrid' club?", options: ["A club for left and right-handers", "A cross between an iron and a fairway wood", "A putter-wedge combination", "A club with two clubfaces"], correct: 1, explanation: "Hybrids combine the best features of irons and fairway woods — the accuracy of an iron with the forgiveness and higher launch of a wood. They've largely replaced long irons for many golfers." },
        { q: "What replaced persimmon wood in modern driver construction?", options: ["Steel", "Titanium", "Carbon fiber composite", "Aluminum"], correct: 2, explanation: "Titanium became the dominant driver material in the late 1990s, replacing persimmon wood. It's lighter and stronger, allowing for much larger clubheads (up to 460cc) with a bigger sweet spot." },
        { q: "What is a 'grooveless' putter face designed to do?", options: ["Reduce friction", "Create topspin", "Reduce backspin for a truer roll", "Nothing — it's illegal"], correct: 2, explanation: "Many modern putters use grooveless or micro-groove face inserts designed to reduce backspin and skid, promoting immediate topspin for a truer, more consistent roll on the green." },
        { q: "What is a 'fitting' in golf?", options: ["A fashion event", "Custom-measuring clubs to your swing", "Installing a grip", "A putting technique"], correct: 1, explanation: "Club fitting is the process of customizing club specifications (length, lie angle, loft, shaft flex, grip size) to match your specific body measurements and swing characteristics. It can add 5-15 yards." },

        /* ═══ SCORING TERMS ═══ */
        { q: "What is a 'birdie' in golf?", options: ["Two under par", "One under par", "One over par", "A hole-in-one"], correct: 1, explanation: "A birdie is 1 stroke under par. The term originated in the early 1900s when 'bird' was American slang for something great!" },
        { q: "What does the term 'eagle' mean in golf?", options: ["One under par", "Two under par", "Three under par", "A perfect shot"], correct: 1, explanation: "An eagle is 2 strokes under par on a hole. It followed the 'birdie' naming convention — an eagle is a big birdie!" },
        { q: "What is a 'bogey'?", options: ["One under par", "Even par", "One over par", "Two over par"], correct: 2, explanation: "A bogey is 1 stroke over par. The term comes from 'Colonel Bogey' — an imaginary opponent who always plays the ground score (par)." },
        { q: "What is an 'albatross' (also called a double eagle)?", options: ["One under par", "Two under par", "Three under par", "Four under par"], correct: 2, explanation: "An albatross is 3 under par on a single hole — usually holing out from the fairway on a par 5. It's extremely rare!" },
        { q: "What is the term for hitting the ball into the hole in one stroke from the tee?", options: ["Eagle", "Albatross", "Ace", "Condor"], correct: 2, explanation: "A hole-in-one is also called an 'Ace.' The odds for an amateur golfer making one are about 12,500 to 1!" },
        { q: "What is 'stableford' scoring?", options: ["Points-based where higher is better", "Stroke play where lower is better", "Match play scoring", "Team scoring"], correct: 0, explanation: "Stableford awards points based on performance: 0 for double bogey+, 1 for bogey, 2 for par, 3 for birdie, 4 for eagle. Highest total wins!" },
        { q: "What is 'match play' in golf?", options: ["Playing against the course", "Competing hole by hole", "Total stroke competition", "Team tournament format"], correct: 1, explanation: "In match play, you compete hole by hole against your opponent. Win the most holes to win the match. It's golf's head-to-head format." },
        { q: "What is 'green in regulation' (GIR)?", options: ["Reaching the green under par", "Reaching green in par minus 2 strokes", "Hitting every fairway", "Making par or better"], correct: 1, explanation: "GIR means reaching the putting green in the expected number of strokes minus 2 (to leave room for 2 putts). For a par 4, that means getting on the green in 2 shots." },
        { q: "What does 'dormie' mean in match play?", options: ["The match is tied", "Leading by as many holes as remain", "Down by one hole", "The match is over"], correct: 1, explanation: "Dormie means a player leads by the exact number of holes remaining. For example, 3 up with 3 to play. The leading player cannot lose — only win or tie." },
        { q: "What is a 'condor' in golf?", options: ["1 under par", "2 under par", "3 under par", "4 under par"], correct: 3, explanation: "A condor is 4-under par on a single hole — essentially a hole-in-one on a par 5. It's the rarest score in golf; only a handful have ever been recorded!" },
        { q: "What does 'all square' mean in match play?", options: ["Each player scored 4", "The match is tied", "All holes have been played", "Players share a tee"], correct: 1, explanation: "All square simply means the match is tied — neither player is ahead. If the match ends all square, it's either a tie or goes to extra holes depending on the format." },

        /* ═══ COURSE KNOWLEDGE ═══ */
        { q: "What is the diameter of a standard golf hole?", options: ["3.5 inches", "4 inches", "4.25 inches", "4.5 inches"], correct: 2, explanation: "The hole must be exactly 4.25 inches (10.8 cm) in diameter and at least 4 inches deep. This has been standard since 1891." },
        { q: "What is the name of the area of short grass between the tee and the green?", options: ["Rough", "Fairway", "Apron", "Fringe"], correct: 1, explanation: "The fairway is the closely mowed strip of grass where you want your ball to land. It provides the best lies for approach shots." },
        { q: "What is the 'rough' in golf?", options: ["A sand trap", "Tall grass next to the fairway", "A water hazard", "The putting green"], correct: 1, explanation: "The rough is the longer, thicker grass bordering the fairway. It penalizes inaccurate shots by making it harder to advance the ball." },
        { q: "What is 'reading the green'?", options: ["Looking at a scorecard", "Studying the grass color", "Determining the putt's line and break", "Checking the wind direction"], correct: 2, explanation: "Reading the green means analyzing the slopes, breaks, grain, and speed to determine the correct line and pace for your putt." },
        { q: "What is the standard par for most 18-hole golf courses?", options: ["68", "70", "72", "74"], correct: 2, explanation: "Par 72 is the most common (typically: 4 par-3s, 10 par-4s, 4 par-5s). But courses can range from par 68 to par 73 depending on hole layouts." },
        { q: "What is a 'divot' in golf?", options: ["A hole in the green", "A chunk of turf displaced by a club", "The ball's landing area", "A scoring term"], correct: 1, explanation: "A divot is the piece of turf (or the hole it leaves) carved out when an iron strikes the ground through impact. Always repair your divots!" },
        { q: "Where is TPC Sawgrass famous island green (17th hole)?", options: ["Pebble Beach, CA", "Augusta, GA", "Ponte Vedra Beach, FL", "Hilton Head, SC"], correct: 2, explanation: "The iconic island green 17th hole at TPC Sawgrass in Ponte Vedra Beach, Florida is the most recognized par 3 in golf. It eats about 100,000 balls a year!" },
        { q: "What is 'Amen Corner' at Augusta National?", options: ["The pro shop entrance", "Holes 11, 12, and 13", "The 18th green amphitheater", "The practice facility"], correct: 1, explanation: "Amen Corner is the nickname for holes 11, 12, and 13 at Augusta National. It's one of the most treacherous stretches in golf, where the Masters is often won or lost." },
        { q: "What is 'the grain' of a putting green?", options: ["The type of grass seed", "The direction the grass blades lean", "The thickness of the turf", "The color of the grass"], correct: 1, explanation: "Grain is the direction that the grass blades grow and lean. Putting with the grain is faster; putting against the grain is slower. Bermuda grass tends to have very pronounced grain." },
        { q: "What is a 'links' course?", options: ["Any course near a city", "A coastal course on sandy soil", "A course with lots of water", "An indoor course"], correct: 1, explanation: "Links courses are built on sandy, coastal land ('linking' the sea to arable land). They feature firm turf, few trees, natural dunes, pot bunkers, and strong winds. The birthplace of golf!" },
        { q: "What type of grass is most common on greens in the southern United States?", options: ["Bentgrass", "Bermuda", "Fescue", "Ryegrass"], correct: 1, explanation: "Bermuda grass thrives in warm climates and is the most common putting surface in the South. It's more heat-tolerant than bentgrass, which dominates northern courses." },
        { q: "What is a 'dog leg' on a golf course?", options: ["A course mascot", "A hole that bends left or right", "A short par 3", "A penalty area"], correct: 1, explanation: "A dogleg is a hole where the fairway angles sharply to the left or right, resembling a dog's bent leg. It requires strategic shot placement off the tee." },
        { q: "What does 'stimp reading' measure?", options: ["Wind speed", "Green speed", "Course difficulty", "Grass height"], correct: 1, explanation: "The Stimpmeter measures the speed of a putting green. A ball is rolled down a standard ramp, and the distance it travels determines the reading. Tour greens typically stimp at 11-14 feet." },

        /* ═══ HISTORY & ORIGINS ═══ */
        { q: "Where was golf invented?", options: ["England", "Scotland", "Ireland", "Netherlands"], correct: 1, explanation: "Golf as we know it originated in Scotland in the 15th century. The Old Course at St. Andrews is often called 'The Home of Golf.'" },
        { q: "What is the oldest golf club in the world?", options: ["St. Andrews", "Royal & Ancient", "Honourable Company of Edinburgh Golfers", "Musselburgh Golf Club"], correct: 2, explanation: "The Honourable Company of Edinburgh Golfers, founded in 1744, is the oldest golf club with verifiable records. Their original 13 rules formed the basis of the modern rules of golf." },
        { q: "When was the first Open Championship played?", options: ["1800", "1860", "1900", "1920"], correct: 1, explanation: "The first Open Championship was played in 1860 at Prestwick Golf Club in Scotland. Willie Park Sr. won the inaugural event with a score of 174 over 36 holes." },
        { q: "Who wrote the original 13 rules of golf?", options: ["Royal & Ancient Golf Club", "Honourable Company of Edinburgh Golfers", "USGA", "King James II"], correct: 1, explanation: "The Honourable Company of Edinburgh Golfers wrote the original 13 Rules of Golf in 1744 for their first competition at Leith Links. These rules formed the foundation of modern golf rules." },
        { q: "In what year was the Masters Tournament first played?", options: ["1920", "1934", "1946", "1958"], correct: 1, explanation: "The first Masters was played in 1934 at Augusta National Golf Club. It was originally called the 'Augusta National Invitation Tournament' and was co-founded by Bobby Jones and Clifford Roberts." },
        { q: "What Scottish king banned golf in 1457?", options: ["King James I", "King James II", "King James IV", "King Robert III"], correct: 1, explanation: "King James II of Scotland banned golf in 1457 because it was distracting young men from practicing archery, which was needed for national defense. The ban was largely ignored!" },
        { q: "When was the USGA (United States Golf Association) founded?", options: ["1864", "1894", "1914", "1934"], correct: 1, explanation: "The USGA was founded in 1894 to govern the game of golf in the United States and Mexico. It conducts the U.S. Open, U.S. Amateur, and several other national championships." },
        { q: "Who was Bobby Jones?", options: ["A modern PGA Tour player", "The greatest amateur golfer ever", "The inventor of the golf tee", "The first golf course designer"], correct: 1, explanation: "Bobby Jones is widely considered the greatest amateur golfer in history. He won 13 major championships (including amateur majors), completed the Grand Slam in 1930, and co-founded Augusta National." },
        { q: "What is the oldest course still in play?", options: ["St. Andrews", "Musselburgh Links", "Royal Troon", "Carnoustie"], correct: 1, explanation: "Musselburgh Links in Scotland is recognized as the oldest golf course in the world, with documented play dating back to 1672. St. Andrews claims play from the 1400s but the Old Course's current form dates later." },
        { q: "When were steel shafts first permitted in professional golf?", options: ["1909", "1929", "1949", "1969"], correct: 1, explanation: "The USGA approved steel shafts in 1924, and the R&A followed in 1929. This replaced hickory wood shafts and revolutionized the game, leading to the modern golf swing." },

        /* ═══ FAMOUS PLAYERS & LEGENDS ═══ */
        { q: "Who has won the most major championships in men's golf?", options: ["Tiger Woods (15)", "Jack Nicklaus (18)", "Arnold Palmer (7)", "Ben Hogan (9)"], correct: 1, explanation: "Jack Nicklaus holds the record with 18 major championships. Tiger Woods is second with 15. This record has stood since 1986!" },
        { q: "Who is known as 'The Golden Bear' in golf?", options: ["Tiger Woods", "Arnold Palmer", "Jack Nicklaus", "Gary Player"], correct: 2, explanation: "Jack Nicklaus is known as 'The Golden Bear.' He won 18 major championships, more than any other golfer in history." },
        { q: "Who won the 1997 Masters by 12 strokes at age 21?", options: ["Phil Mickelson", "Ernie Els", "Tiger Woods", "Fred Couples"], correct: 2, explanation: "Tiger Woods won the 1997 Masters by a record 12 strokes with a score of -18 (270), becoming the youngest Masters champion at 21." },
        { q: "What is the minimum age to play on the PGA Tour?", options: ["16", "18", "21", "No minimum"], correct: 1, explanation: "You must be 18 to become a PGA Tour member. However, sponsors' exemptions can allow younger players to compete in individual events." },
        { q: "Which golfer won 11 consecutive PGA Tour events in 1945?", options: ["Sam Snead", "Ben Hogan", "Byron Nelson", "Bobby Jones"], correct: 2, explanation: "Byron Nelson won 11 consecutive PGA Tour events in 1945 — a record that still stands. He won 18 tournaments that year total. 'Lord Byron' retired the following year at age 34." },
        { q: "Who was the first golfer to earn $1 billion in career earnings?", options: ["Jack Nicklaus", "Phil Mickelson", "Tiger Woods", "Arnold Palmer"], correct: 2, explanation: "Tiger Woods became the first athlete in any sport to earn over $1 billion through a combination of prize money, endorsements, and business ventures." },
        { q: "Which golfer is nicknamed 'The King'?", options: ["Jack Nicklaus", "Tiger Woods", "Arnold Palmer", "Gary Player"], correct: 2, explanation: "Arnold Palmer was known as 'The King' for his charismatic personality and his role in popularizing golf through television in the 1950s and 60s. His fans were called 'Arnie's Army.'" },
        { q: "How many career PGA Tour victories does Tiger Woods have?", options: ["72", "79", "82", "87"], correct: 2, explanation: "Tiger Woods has 82 PGA Tour victories, tying Sam Snead's all-time record. His 82nd win came at the 2019 Zozo Championship in Japan." },
        { q: "Who are the only six men to complete the career Grand Slam?", options: ["Nicklaus, Woods, Hogan, Player, McIlroy, Sarazen", "Nicklaus, Woods, Palmer, Player, Snead, Sarazen", "Nicklaus, Woods, Hogan, Watson, McIlroy, Sarazen", "Nicklaus, Woods, Hogan, Player, Mickelson, Sarazen"], correct: 0, explanation: "Only six men have won all four major championships in their career: Jack Nicklaus, Tiger Woods, Ben Hogan, Gary Player, Rory McIlroy, and Gene Sarazen. McIlroy completed his in 2025." },
        { q: "What was Arnold Palmer's famous 'drink'?", options: ["Coffee and whiskey", "Half iced tea, half lemonade", "Ginger ale and lime", "Beer and tomato juice"], correct: 1, explanation: "The 'Arnold Palmer' is a popular non-alcoholic drink mixing half iced tea and half lemonade. Palmer made it famous by regularly ordering it at clubhouses and restaurants." },
        { q: "Which golfer is known as the 'Black Knight'?", options: ["Tiger Woods", "Gary Player", "Vijay Singh", "Lee Trevino"], correct: 1, explanation: "Gary Player is nicknamed the 'Black Knight' because he famously wore all-black clothing during tournaments. He won 9 major championships and was one of golf's Big Three alongside Palmer and Nicklaus." },
        { q: "Who holds the record for most PGA Tour wins in a single season (post-1945)?", options: ["Tiger Woods (9)", "Ben Hogan (13)", "Byron Nelson (18)", "Sam Snead (11)"], correct: 0, explanation: "In the modern era, Tiger Woods holds the record with 9 PGA Tour wins in 2000. Byron Nelson's 18 wins in 1945 is the all-time record, though it was during a wartime-modified tour." },
        { q: "Which lefty has won 6 major championships?", options: ["Bubba Watson", "Mike Weir", "Phil Mickelson", "Bob Charles"], correct: 2, explanation: "Phil Mickelson has won 6 major championships — 3 Masters (2004, 2006, 2010), 1 PGA Championship (2005), 1 Open Championship (2013), and 1 PGA Championship (2021) at age 50." },
        { q: "Who was Lee Trevino?", options: ["A course designer", "A Mexican-American Hall of Famer with 6 majors", "The first Black PGA Tour player", "A British Open-era golfer"], correct: 1, explanation: "Lee Trevino was a Mexican-American golfer who won 6 major championships and 29 PGA Tour events. Known as 'The Merry Mex,' he was famous for his wit, self-taught swing, and incredible ball-striking." },
        { q: "Which golfer survived a near-fatal car crash in 1949 and returned to win 6 more majors?", options: ["Bobby Jones", "Sam Snead", "Ben Hogan", "Arnold Palmer"], correct: 2, explanation: "Ben Hogan nearly died in a head-on collision with a bus in February 1949. Doctors doubted he'd walk again, but he returned 11 months later and won 6 of his 9 major titles after the accident." },
        { q: "Who is Scottie Scheffler?", options: ["A course architect", "World #1 who won 4 majors by 2025", "A famous golf commentator", "A Ryder Cup captain"], correct: 1, explanation: "Scottie Scheffler has been the dominant force in golf in the mid-2020s, winning 4 major championships (2 Masters, 1 U.S. Open, 1 PGA Championship) and spending extensive time as world number 1." },
        { q: "Which golfer famously said 'The more I practice, the luckier I get'?", options: ["Arnold Palmer", "Jack Nicklaus", "Gary Player", "Ben Hogan"], correct: 2, explanation: "Gary Player is credited with this famous quote, though it's been attributed to others. Player was known for his extraordinary fitness regimen and work ethic, highly unusual for golfers of his era." },

        /* ═══ TOURNAMENTS & MAJORS ═══ */
        { q: "In which month is The Masters traditionally played?", options: ["March", "April", "May", "June"], correct: 1, explanation: "The Masters is held the first full week of April at Augusta National Golf Club in Georgia. It's the first major championship of the year." },
        { q: "What color jacket does the Masters champion receive?", options: ["Blue", "Red", "Green", "Gold"], correct: 2, explanation: "The Masters champion receives the famous Green Jacket. It was first awarded to Sam Snead in 1949." },
        { q: "Which of these is NOT one of golf's four men's major championships?", options: ["The Masters", "The Players Championship", "U.S. Open", "The Open Championship"], correct: 1, explanation: "The four men's majors are: The Masters, PGA Championship, U.S. Open, and The Open Championship. The Players Championship, while prestigious, is not a major." },
        { q: "What is the Ryder Cup?", options: ["A PGA Tour event", "A biennial team competition between US and Europe", "A senior golf major", "A women's golf tournament"], correct: 1, explanation: "The Ryder Cup is a biennial team match-play competition between the United States and Europe, first held in 1927. It's named after English businessman Samuel Ryder." },
        { q: "How often is the Ryder Cup played?", options: ["Annually", "Every 2 years", "Every 3 years", "Every 4 years"], correct: 1, explanation: "The Ryder Cup is played every 2 years (biennially), alternating between European and American venues. The 2025 edition was held at Bethpage Black in New York." },
        { q: "What is the Claret Jug?", options: ["A type of golf club", "The Open Championship trophy", "A scoring format", "A famous golf hole"], correct: 1, explanation: "The Claret Jug (officially the 'Golf Champion Trophy') is the trophy awarded to the winner of The Open Championship. The original has been awarded since 1873." },
        { q: "Which organization runs The Open Championship?", options: ["USGA", "PGA of America", "The R&A", "European Tour"], correct: 2, explanation: "The R&A (Royal and Ancient Golf Club of St Andrews) organizes The Open Championship. Along with the USGA, it writes and administers the Rules of Golf worldwide." },
        { q: "What is the Solheim Cup?", options: ["A men's team event", "The women's equivalent of the Ryder Cup", "A senior golf tournament", "An amateur championship"], correct: 1, explanation: "The Solheim Cup is the women's equivalent of the Ryder Cup, featuring teams from the US and Europe. It was first played in 1990 and is named after Karsten Solheim, founder of PING." },
        { q: "What is the oldest major championship?", options: ["The Masters", "U.S. Open", "PGA Championship", "The Open Championship"], correct: 3, explanation: "The Open Championship (often called 'The British Open') is the oldest major, first played in 1860 at Prestwick Golf Club in Scotland. It predates the other majors by decades." },
        { q: "What is the FedEx Cup?", options: ["A single tournament", "The PGA Tour season-long points championship", "A team event", "An amateur trophy"], correct: 1, explanation: "The FedEx Cup is the PGA Tour's season-long points competition, culminating in the Tour Championship. Created in 2007, it awards an $18 million bonus to the winner." },
        { q: "What is unique about The Masters compared to other majors?", options: ["It's always at the same course", "It's the longest tournament", "It allows amateurs", "It's the newest major"], correct: 0, explanation: "The Masters is the only major always played at the same venue — Augusta National Golf Club. The other three majors rotate to different courses. Augusta's familiarity makes it beloved by fans and players." },
        { q: "How is the order of play ('honors') determined on the first tee?", options: ["Alphabetical", "By handicap", "By drawing lots or tee time", "By age"], correct: 2, explanation: "The honor on the first tee is typically determined by the draw (tee time assignment). After that, the player with the lowest score on the previous hole has the honor." },

        /* ═══ RYDER CUP & TEAM EVENTS ═══ */
        { q: "When was the first Ryder Cup played?", options: ["1907", "1927", "1947", "1957"], correct: 1, explanation: "The first official Ryder Cup was held in 1927 at Worcester Country Club in Massachusetts. The United States defeated Great Britain 9½ to 2½." },
        { q: "Who holds the record for most Ryder Cup points?", options: ["Phil Mickelson", "Tiger Woods", "Sergio García", "Jack Nicklaus"], correct: 2, explanation: "Sergio García holds the all-time Ryder Cup record with 28½ points. He compiled a 25-13-7 record across his appearances." },
        { q: "Who has made the most Ryder Cup appearances?", options: ["Sergio García", "Phil Mickelson", "Tiger Woods", "Nick Faldo"], correct: 1, explanation: "Phil Mickelson holds the record with 12 Ryder Cup appearances for the United States, spanning from 1995 to 2018." },
        { q: "What famous act of sportsmanship occurred at the 1969 Ryder Cup?", options: ["Palmer's farewell speech", "Nicklaus conceded Jacklin's putt", "Player refused to accept the trophy", "Trevino gave his clubs away"], correct: 1, explanation: "On the final hole of the 1969 Ryder Cup at Royal Birkdale, Jack Nicklaus picked up Tony Jacklin's ball marker, graciously conceding a short putt. This tied the matches. 'I don't think you would have missed that putt,' Nicklaus said." },
        { q: "Which Ryder Cup event was nicknamed 'The Miracle at Medinah'?", options: ["2004", "2008", "2012", "2016"], correct: 2, explanation: "The 2012 Ryder Cup at Medinah Country Club saw Europe overcome a 10-6 deficit to win 14½-13½, one of the greatest comebacks in sporting history. Ian Poulter's five consecutive Saturday birdies sparked the rally." },
        { q: "How many points are available in a modern Ryder Cup?", options: ["20", "24", "28", "32"], correct: 2, explanation: "The modern Ryder Cup format has 28 points available: 4 foursomes + 4 fourballs on Friday, repeated Saturday, then 12 singles on Sunday. Each match is worth 1 point (½ for a tie)." },
        { q: "What is a 'foursomes' match?", options: ["Four players on a team", "Two-person teams taking alternate shots", "Four-ball best ball", "A stroke play format"], correct: 1, explanation: "In foursomes (alternate shot), two players on the same team share one ball and alternate shots, including tee shots. It requires great teamwork and strategy." },
        { q: "Who won the 2025 Ryder Cup?", options: ["United States", "Europe", "It was tied", "It was cancelled"], correct: 1, explanation: "Europe won the 2025 Ryder Cup 15-13 at Bethpage Black Course in Farmingdale, New York. The European team overcame a hostile American crowd to claim victory." },

        /* ═══ WOMEN'S GOLF & LPGA ═══ */
        { q: "Who is considered the greatest female golfer of all time?", options: ["Annika Sörenstam", "Patty Berg", "Mickey Wright", "Lorena Ochoa"], correct: 0, explanation: "Annika Sörenstam is widely considered the greatest female golfer ever, with 10 major championships, 72 LPGA Tour wins, and a record 59 in competition (the only woman to break 60)." },
        { q: "How many women's major championships are there currently?", options: ["3", "4", "5", "6"], correct: 2, explanation: "There are 5 women's majors: the Chevron Championship, Women's PGA Championship, U.S. Women's Open, Women's Open Championship (AIG), and the Evian Championship (since 2013)." },
        { q: "Who was the first woman to play in a PGA Tour event?", options: ["Annika Sörenstam", "Babe Zaharias", "Michelle Wie", "Se Ri Pak"], correct: 1, explanation: "Babe Zaharias played in PGA Tour events in the 1940s-50s and even made the cut at the 1945 Los Angeles Open. Annika Sörenstam famously played the 2003 Bank of America Colonial." },
        { q: "What did Annika Sörenstam shoot to make LPGA history in 2001?", options: ["A 57", "A 58", "A 59", "A 60"], correct: 2, explanation: "Annika Sörenstam shot 59 at the 2001 Standard Register PING, becoming the first and still only woman to break 60 in an official professional tournament." },
        { q: "When was the LPGA Tour founded?", options: ["1930", "1940", "1950", "1960"], correct: 2, explanation: "The LPGA (Ladies Professional Golf Association) Tour was founded in 1950 by 13 women, including Patty Berg, Louise Suggs, and Babe Zaharias. Berg was its first president." },
        { q: "Who won 5 LPGA majors before the age of 22?", options: ["Nelly Korda", "Lydia Ko", "Lexi Thompson", "Inbee Park"], correct: 1, explanation: "Lydia Ko from New Zealand won her first LPGA major at age 18 and became the youngest golfer (male or female) to be ranked world number 1 at age 17." },
        { q: "Which country has dominated women's golf in recent decades?", options: ["USA", "Sweden", "South Korea", "Japan"], correct: 2, explanation: "South Korean golfers have dominated the LPGA Tour since the early 2000s, routinely holding multiple spots in the world top 10. Se Ri Pak's breakthrough wins in 1998 inspired a generation of Korean women." },
        { q: "What is the Solheim Cup named after?", options: ["A famous course", "Karsten Solheim, founder of PING", "A Swedish golfer", "A trophy designer"], correct: 1, explanation: "The Solheim Cup is named after Karsten Solheim, the Norwegian-American engineer who founded PING golf. He proposed the women's team competition in the spirit of the Ryder Cup." },

        /* ═══ TECHNIQUE & STRATEGY ═══ */
        { q: "What is a 'fade' in golf?", options: ["A ball that curves left to right (for righties)", "A ball that curves right to left", "A ball that goes straight up", "A ball that rolls after landing"], correct: 0, explanation: "A fade curves gently from left to right for a right-handed player. Many consider it the most controllable shot shape." },
        { q: "What does 'the yips' refer to in golf?", options: ["A celebration dance", "Involuntary wrist spasms while putting", "A type of bunker shot", "Missing the cut in a tournament"], correct: 1, explanation: "The yips is a real neurological condition causing involuntary muscle spasms, usually affecting putting or chipping. It has ended careers of professional golfers." },
        { q: "What is a 'draw' shot?", options: ["A tie between players", "A ball that curves right to left (for righties)", "A ball that stays straight", "A ball that goes high"], correct: 1, explanation: "A draw curves gently from right to left for a right-handed golfer (opposite for lefties). It generally produces more distance than a fade due to reduced backspin and a more penetrating flight." },
        { q: "What is 'lag putting'?", options: ["Putting while laying down", "A long putt aimed to get close to the hole", "Putting with a sand wedge", "A putting grip style"], correct: 1, explanation: "Lag putting is the strategy of putting long-distance putts close to the hole rather than trying to make them. The goal is to avoid three-putts — getting within 2-3 feet of the hole is usually success." },
        { q: "What is the 'flop shot'?", options: ["A failed shot", "A high, soft shot over an obstacle", "A running chip along the ground", "A punch shot under trees"], correct: 1, explanation: "A flop shot is a high, soft shot played with an open clubface (usually a lob wedge) that lands softly with minimal roll. Phil Mickelson is famous for his mastered flop shots." },
        { q: "What does 'playing the percentages' mean in course management?", options: ["Calculating prize money", "Choosing the safest strategic option", "Always aiming at the flag", "Playing as fast as possible"], correct: 1, explanation: "Playing the percentages means making smart choices: aiming for the center of the green instead of a tucked pin, laying up rather than going for a risky carry. It consistently produces lower scores." },
        { q: "What is the '60-degree rule' in chipping?", options: ["Use a 60° wedge for all chips", "The ball spends 60% rolling", "Chip from 60 yards", "Aim 60° from the flag"], correct: 1, explanation: "A general chipping principle suggests that with a standard chip, the ball spends roughly 1/3 of its journey in the air and 2/3 rolling. Choosing the right club adjusts this ratio." },
        { q: "What is an 'up and down'?", options: ["A roller coaster round", "Getting the ball in the hole in 2 shots from off the green", "Moving up in the leaderboard", "A type of putt"], correct: 1, explanation: "An up and down means chipping or pitching onto the green (the 'up') and making the putt (the 'down') — completing the hole in just 2 shots from off the green. It's a key scrambling stat." },

        /* ═══ GOLF SCIENCE & MISCELLANEOUS ═══ */
        { q: "What percentage of golfers ever break 100 for 18 holes?", options: ["About 25%", "About 50%", "About 75%", "About 90%"], correct: 1, explanation: "Roughly half of all golfers can consistently break 100. Breaking 80 is achievable by only about 5-10% of golfers, and breaking par is extremely rare for amateurs." },
        { q: "How fast does a PGA Tour pro's driver swing typically travel?", options: ["85-95 mph", "100-110 mph", "113-120 mph", "130+ mph"], correct: 2, explanation: "The average PGA Tour driver swing speed is about 115 mph, with some players like Rory McIlroy and Cameron Champ consistently exceeding 120 mph. The average amateur swings around 93 mph." },
        { q: "At what altitude does a golf ball travel roughly 10% farther?", options: ["2,000 feet", "5,000 feet", "10,000 feet", "15,000 feet"], correct: 1, explanation: "At roughly 5,000 feet elevation (like Denver, Colorado), the thinner air provides less resistance, causing the ball to travel about 10% farther. This is why club selection is crucial at altitude." },
        { q: "What is the 'smash factor' in golf?", options: ["How hard you hit the ball", "Ball speed divided by clubhead speed", "The sound the club makes", "The amount of divot taken"], correct: 1, explanation: "Smash factor is ball speed divided by clubhead speed. An ideal driver smash factor is about 1.50, meaning a 100 mph swing produces a 150 mph ball speed. It measures the efficiency of your strike." },
        { q: "How many acres does a typical 18-hole golf course cover?", options: ["50-60 acres", "100-120 acres", "150-200 acres", "250-300 acres"], correct: 2, explanation: "A typical 18-hole golf course covers about 150-200 acres, though some can be smaller or larger. Only about 30-40% of that is actually 'in play' — the rest is rough, woods, and natural areas." },
        { q: "What percentage of professional golfers' total strokes are putts?", options: ["About 25%", "About 33%", "About 43%", "About 55%"], correct: 2, explanation: "Approximately 43% of all strokes are putts. This is why the old saying goes: 'Drive for show, putt for dough.' Improving your putting is the fastest way to lower scores." },
        { q: "What is a 'launch monitor'?", options: ["A GPS device", "A device that tracks ball flight data", "A type of range finder", "A weather station"], correct: 1, explanation: "A launch monitor uses radar or camera technology to measure critical data: ball speed, launch angle, spin rate, carry distance, and more. Popular models include TrackMan, FlightScope, and GCQuad." }
    ],

    /* ── Fun Facts ──────────────────────────────────────── */
    funFacts: [
        /* ═══ ICONIC MOMENTS & HISTORY ═══ */
        { icon: "🌍", title: "Golf on the Moon", text: "Astronaut Alan Shepard hit two golf balls on the Moon in 1971 during the Apollo 14 mission. He used a makeshift 6-iron and claims the second ball went 'miles and miles' — though it was probably about 200 yards in the low gravity!" },
        { icon: "📺", title: "Most Watched Golf Shot Ever", text: "Tiger Woods' chip-in on the 16th hole at the 2005 Masters — where the ball paused on the lip of the cup before dropping — is considered the most iconic shot in golf history." },
        { icon: "🕰️", title: "Oldest Golf Club", text: "The Honourable Company of Edinburgh Golfers, founded in 1744, is the oldest golf club in the world. Their original 13 rules formed the basis of the modern rules of golf." },
        { icon: "👑", title: "Golf Was Once Banned", text: "King James II of Scotland banned golf in 1457 because young men were playing golf instead of practicing archery for national defense. The ban was widely ignored, and subsequent monarchs also tried — and failed — to stop people from playing." },
        { icon: "🏛️", title: "Bobby Jones' Grand Slam", text: "In 1930, Bobby Jones won all four major championships of his era in a single year — the original Grand Slam. He then retired from competitive golf at age 28, at the peak of his career, to practice law." },
        { icon: "🏥", title: "Hogan's Miraculous Comeback", text: "In 1949, Ben Hogan nearly died when his car collided head-on with a bus. Doctors thought he'd never walk again, let alone play golf. He returned 11 months later and went on to win 6 more majors." },
        { icon: "🤝", title: "The Concession", text: "At the 1969 Ryder Cup, Jack Nicklaus picked up Tony Jacklin's ball marker, conceding his putt on the final hole to tie the match. 'I don't think you would have missed,' Nicklaus said. 'But I wasn't going to give you the chance.' It's considered the greatest act of sportsmanship in golf." },
        { icon: "🎭", title: "The Miracle at Medinah", text: "At the 2012 Ryder Cup, Europe overcame an 'impossible' 10-6 deficit to win 14½-13½ — one of the greatest comebacks in all of sports. Ian Poulter's five consecutive birdies on Saturday evening sparked the miracle." },
        { icon: "🔴", title: "Tiger's Red Sunday", text: "Tiger Woods always wears a red shirt on Sundays. His mother told him as a child that red was his 'power color.' He has 82 PGA Tour wins, and the tradition became one of sports' most iconic superstitions." },

        /* ═══ SCIENCE & PHYSICS ═══ */
        { icon: "⚡", title: "Lightning Risk", text: "Golf courses are the #1 most dangerous outdoor location for lightning strikes. About 5% of all lightning fatalities in the US occur on golf courses. If you hear thunder, get off the course IMMEDIATELY!" },
        { icon: "🏔️", title: "World's Highest Course", text: "The world's highest golf course is La Paz Golf Club in Bolivia, at 10,800 feet above sea level. At that altitude, the ball flies about 15% farther than at sea level!" },
        { icon: "📊", title: "43% Putting", text: "Approximately 43% of all strokes in a round of golf are putts. That means improving your putting from 36 putts to 30 putts per round saves 6 strokes — the equivalent of going from a 20 handicap to a 14!" },
        { icon: "🏋️", title: "Pro Swing Speed", text: "The average PGA Tour driver swing speed is about 115 mph. Rory McIlroy and Cameron Champ consistently swing over 120 mph. The average amateur swings about 93 mph." },
        { icon: "🔬", title: "The Dimple Effect", text: "A dimpled golf ball travels nearly twice as far as a smooth one. The 300-500 dimples create a thin turbulent boundary layer that reduces aerodynamic drag by up to 50%. Without dimples, a 250-yard drive would only go about 130 yards." },
        { icon: "🌡️", title: "Temperature Matters", text: "A golf ball travels about 2 yards less for every 10°F drop in temperature. Cold air is denser, creating more drag, and cold balls compress less. A 50°F day costs you roughly 8-10 yards vs a 90°F day." },
        { icon: "🔄", title: "Ball Spin Rates", text: "A PGA Tour pro's driver creates backspin of about 2,500-3,000 RPM. Their wedge shots spin at 8,000-10,000 RPM. That incredible spin is what makes the ball check and stop (or spin back) on the green." },
        { icon: "🎯", title: "Impact Duration", text: "A golf ball is in contact with the clubface for only about 0.0005 seconds (half a millisecond). During that fleeting instant, the ball compresses by about 30% of its diameter before springing off the face." },
        { icon: "💨", title: "Wind vs Distance", text: "A 10 mph headwind takes roughly 8-12 yards off a driver, but a 10 mph tailwind only adds about 5-6 yards. The headwind effect is nearly double the tailwind benefit because of how drag increases with relative airspeed." },

        /* ═══ RECORDS & STATISTICS ═══ */
        { icon: "📏", title: "Longest Drive Ever", text: "Mike Austin hit a 515-yard drive in 1974 during a professional event. He was 64 years old at the time! The strong tailwind helped, but that's still absolutely incredible." },
        { icon: "🎯", title: "Hole-in-One Odds", text: "The odds of an average amateur making a hole-in-one are about 12,500 to 1. For a pro, it's about 2,500 to 1. If you get one, tradition says you buy drinks for everyone in the clubhouse!" },
        { icon: "🦅", title: "Double Eagle Rarity", text: "An albatross (double eagle) is estimated to occur once in every 6 million shots played. That makes it about 6 times rarer than a hole-in-one!" },
        { icon: "👶", title: "Youngest Hole-in-One", text: "The youngest person to record a hole-in-one was Coby Orr, who was just 5 years old when he aced a 103-yard hole in Littleton, Colorado in 1975!" },
        { icon: "🏆", title: "Byron Nelson's Streak", text: "In 1945, Byron Nelson won 11 consecutive PGA Tour events and 18 tournaments total that season. His 11-win streak and 18-win season both remain untouched records nearly 80 years later. His scoring average of 68.33 stood until Tiger Woods broke it in 2000." },
        { icon: "🐦", title: "Condor — 4 Under!", text: "A condor (4 under par on a single hole) has been recorded only about 4 times in verified golf history. It requires holing your tee shot on a par 5. The most reliable example is Shaun Lynch's in 1995 at Teign Valley GC — a 496-yard hole." },
        { icon: "👴", title: "Oldest Major Winner", text: "Julius Boros won the 1968 PGA Championship at age 48 years and 4 months, making him the oldest major champion. On the other extreme, Young Tom Morris won the 1868 Open Championship at just 17!" },
        { icon: "🥇", title: "Most Career Majors", text: "Jack Nicklaus holds the all-time record with 18 major championship victories (6 Masters, 5 PGA Championships, 4 U.S. Opens, 3 Open Championships). Tiger Woods is second with 15." },

        /* ═══ FAMOUS COURSES ═══ */
        { icon: "🌊", title: "17th at TPC Sawgrass", text: "The famous island green at TPC Sawgrass's 17th hole eats roughly 100,000+ golf balls per year. The hole is only 137 yards — but it's all carry over water!" },
        { icon: "🎪", title: "The Longest Hole", text: "The longest hole in the world is the 7th hole at Satsuki Golf Club in Japan — a monstrous par 7 stretching 964 yards. It would take most amateurs about 6-7 well-hit shots to reach the green!" },
        { icon: "🌸", title: "Amen Corner", text: "Holes 11, 12, and 13 at Augusta National are called 'Amen Corner' — a writer coined the term because 'if you can get through those three holes, you've said your amens.' The 12th hole, a 155-yard par 3 over Rae's Creek, has destroyed more Masters dreams than any other." },
        { icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", title: "St. Andrews Road Hole", text: "The 17th hole at St. Andrews — the famous 'Road Hole' — is considered the hardest par 4 in the world. A stone wall, a tiny pot bunker, and a road sit inches behind the green. David Duval once made a quadruple-bogey 8 here in the 2000 Open." },
        { icon: "🌉", title: "Pebble Beach Magic", text: "Pebble Beach Golf Links, with its cliffs overlooking the Pacific Ocean, has been rated the #1 public course in America for decades. It hosted the 2019 U.S. Open. Green fees for the public are over $600!" },
        { icon: "🏜️", title: "Desert Golf", text: "Coore & Crenshaw's Sand Hills Golf Club in Nebraska is built on natural sand dunes with no artificial irrigation on the fairways. The course is so remote there's no cell service, and it's consistently ranked among the top courses in the world." },

        /* ═══ PLAYER STORIES ═══ */
        { icon: "💰", title: "Richest Athletes", text: "Tiger Woods was the first athlete in any sport to earn $1 billion. As of 2024, his career earnings from golf and endorsements exceed $1.8 billion." },
        { icon: "🇰🇷", title: "Korea's Golf Obsession", text: "South Korea has over 800 golf courses for a country smaller than Indiana. Se Ri Pak's breakthrough wins in 1998 inspired an entire generation of Korean women to take up golf — Korea now dominates the LPGA Tour." },
        { icon: "🖤", title: "Gary Player: The Black Knight", text: "Gary Player always wore all black on the course. He traveled millions of miles — more than any other athlete — flying from his native South Africa to compete worldwide. He won 9 majors and 165 professional tournaments globally." },
        { icon: "👫", title: "Arnie's Army", text: "Arnold Palmer's charismatic, go-for-broke playing style attracted the first massive golf fan following in the 1950s-60s — dubbed 'Arnie's Army.' Palmer was credited with making golf a television sport and popularizing it among the working class." },
        { icon: "🎩", title: "Payne Stewart", text: "Payne Stewart was famous for wearing knickerbockers and a flat cap — a throwback to golf's earlier era. He made one of the most clutch putts in U.S. Open history on the 72nd hole in 1999. He tragically died in a plane crash just months later." },
        { icon: "🏌️‍♀️", title: "Babe Zaharias", text: "Babe Didrikson Zaharias won Olympic gold medals in track and field before becoming one of the greatest golfers ever. She co-founded the LPGA Tour, won 10 major championships, and once won 17 amateur tournaments in a row." },
        { icon: "🇪🇸", title: "Seve's Genius", text: "Seve Ballesteros was so creative he could play recovery shots from parking lots, between trees, and off cart paths. At the 1979 Open, he drove into a parking lot but still made birdie. His imagination redefined what was possible in golf." },

        /* ═══ COURSE FACTS & NATURE ═══ */
        { icon: "🌱", title: "Water Usage", text: "An average 18-hole golf course uses about 312,000 gallons of water per day. Modern courses are increasingly using recycled water and drought-resistant grasses to reduce this." },
        { icon: "🦅", title: "Wildlife Havens", text: "Golf courses are increasingly recognized as wildlife habitats. Audubon International certifies courses for environmental excellence. Many courses host bald eagles, deer, foxes, and endangered species. Augusta National is home to multiple bird species that thrive in its forests." },
        { icon: "🌿", title: "Turf Types", text: "There are two main families of golf grass: warm-season (Bermuda, Zoysia) for the South and cool-season (Bentgrass, Fescue, Ryegrass) for the North. Augusta National famously oversees its Bermuda fairways with Ryegrass each fall for that perfect emerald color." },
        { icon: "🌊", title: "Links vs Parkland", text: "Links courses (coastal, windswept, sandy) are the original form of golf. Parkland courses (inland, tree-lined, lush) came later. Most American courses are parkland style. True links courses are almost exclusively found in the UK and Ireland." },

        /* ═══ EQUIPMENT & INNOVATION ═══ */
        { icon: "🎾", title: "Golf Ball Rules", text: "A golf ball must not weigh more than 1.62 ounces and must be at least 1.68 inches in diameter. The USGA and R&A test balls with an indoor test range to make sure no ball flies too far!" },
        { icon: "🔧", title: "Iron Byron", text: "The USGA uses a mechanical testing machine called 'Iron Byron' (named after Byron Nelson's famously consistent swing) to test golf equipment. The machine can hit balls with perfect repeatability to determine if clubs and balls conform to rules." },
        { icon: "⛳", title: "Golf Tee History", text: "Before the wooden tee was patented in 1899, golfers used small mounds of wet sand to tee up their balls. Each tee box had a sandbox for this purpose. The wooden tee was revolutionary — and dentist Dr. William Lowell popularized it." },
        { icon: "📐", title: "Club Evolution", text: "In the 1990s, metal drivers were about 200cc. Today's maximum clubhead volume is 460cc — more than double. The larger heads have a drastically bigger sweet spot, making golf more forgiving for average players." },
        { icon: "🏗️", title: "Persimmon to Titanium", text: "Driver heads were made of persimmon wood until the 1990s. The switch to titanium allowed clubheads to be 3x larger while weighing the same. Callaway's Big Bertha (1991) and the titanium Great Big Bertha (1995) revolutionized the industry." },

        /* ═══ CULTURE & TRADITIONS ═══ */
        { icon: "🏌️", title: "Most Popular Sport That Isn't", text: "Golf is played by about 66.6 million people worldwide, with about 25 million in the United States alone. Despite this, many people don't consider it a 'real sport' — golfers disagree!" },
        { icon: "🇺🇸", title: "Eisenhower's Putting Green", text: "President Dwight Eisenhower loved golf so much that he had a putting green installed on the White House South Lawn in 1954. He played over 800 rounds during his presidency!" },
        { icon: "🏖️", title: "Sand Facts", text: "The average bunker shot in professional golf ends up 7 feet from the hole. On the PGA Tour, pros get up-and-down from greenside bunkers about 53% of the time." },
        { icon: "🤝", title: "The Gentleman's Game", text: "Golf is one of the only sports where players call penalties on THEMSELVES. There is no referee watching your every move. The honor system is fundamental to the game." },
        { icon: "🍹", title: "The Arnold Palmer Drink", text: "The famous 'Arnold Palmer' drink — half iced tea, half lemonade — was named after the King himself. Palmer would order it so often at restaurants and clubhouses that it became synonymous with him. It's one of the most ordered non-alcoholic beverages in America." },
        { icon: "🎩", title: "Masters Traditions", text: "The Masters has unique traditions found nowhere else in golf: the Green Jacket ceremony, the Champions Dinner (where the previous year's winner selects the menu), patron (never 'fans') attendance, no running, and pristine beauty that requires blooming azaleas." },
        { icon: "💚", title: "Augusta's Pimento Cheese", text: "Augusta National's pimento cheese sandwiches cost just $1.50 during the Masters — a steal compared to any other sporting event. The affordable concessions are a beloved tradition. The recipe is a closely guarded secret." },
        { icon: "🌍", title: "Golf in the Olympics", text: "Golf was part of the early Olympics in 1900 and 1904, then removed for over 100 years. It returned at the 2016 Rio Olympics after a 112-year absence. Justin Rose won the first gold medal, and Nelly Korda won gold for the women in 2020 (Tokyo)." },
        { icon: "📜", title: "Original 13 Rules", text: "The first written rules of golf (1744) were just 13 simple rules. Today, the Rules of Golf book is over 200 pages. Rule 1 said: 'You must tee your ball within a club's length of the hole.' Golf has come a long way!" },
        { icon: "🃏", title: "Golf Card Games", text: "Many golfers play betting games like Nassau (three separate 9-hole bets), Wolf, Skins, and Bingo-Bango-Bongo. The most popular is the $2 Nassau — a friendly bet that adds excitement without risking a fortune." },
        { icon: "🎵", title: "'The Longest Day'", text: "The U.S. Open setup is deliberately punishing — narrow fairways, deep rough, hard greens, and tucked pins. The USGA's goal is for 'par to be a good score.' Winners typically finish only a few strokes under par, and some years even par wins." }
    ],

    init() {
        this.bindTabs();
        this.render('quiz');
    },

    bindTabs() {
        document.querySelectorAll('.trivia-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.trivia-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.trivia;
                this.render(this.currentTab);
            });
        });
    },

    render(tab) {
        const container = document.getElementById('triviaContent');
        if (!container) return;
        switch (tab) {
            case 'quiz':    container.innerHTML = this.renderQuizStart(); break;
            case 'facts':   container.innerHTML = this.renderFacts(); break;
            case 'records': container.innerHTML = this.renderRecords(); break;
        }
    },

    /* ── Quiz ───────────────────────────────────────────── */
    renderQuizStart() {
        return `
            <div class="quiz-container">
                <div class="quiz-card">
                    <span class="empty-state-code">QUIZ</span>
                    <h2>Golf Trivia Challenge</h2>
                    <p style="color: var(--text-secondary); margin: 16px 0;">Test your golf knowledge with 10 random questions. How many can you get right?</p>
                    
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 24px 0;">
                        <div style="padding: 12px 20px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                            <div style="font-weight: 900; font-size: 1.5rem; color: var(--green-600);">10</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Questions</div>
                        </div>
                        <div style="padding: 12px 20px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                            <div style="font-weight: 900; font-size: 1.5rem; color: var(--green-600);">4</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Choices Each</div>
                        </div>
                        <div style="padding: 12px 20px; background: var(--bg-tertiary); border-radius: var(--radius-md);">
                            <div style="font-weight: 900; font-size: 1.5rem; color: var(--green-600);">∞</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Retries</div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary btn-lg" onclick="Trivia.startQuiz()">Start Quiz</button>
                </div>
            </div>
        `;
    },

    startQuiz() {
        // Fisher-Yates shuffle for unbiased randomization
        const arr = [...this.questionBank];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        this.quizState = {
            questions: arr.slice(0, 10),
            currentIndex: 0,
            score: 0,
            answered: false,
            total: 10,
            results: []  // track per-question correctness
        };
        this.renderQuestion();
    },

    renderQuestion() {
        const state = this.quizState;
        const q = state.questions[state.currentIndex];
        const progress = ((state.currentIndex) / state.total) * 100;

        const container = document.getElementById('triviaContent');
        if (!container) return;
        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-progress">
                    <div class="quiz-progress-bar">
                        <div class="quiz-progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <div class="quiz-score">Q${state.currentIndex + 1}/${state.total} | Score: ${state.score}</div>
                </div>
                
                <div class="quiz-card" id="quizCard">
                    <div class="quiz-question">${q.q}</div>
                    <div class="quiz-options" id="quizOptions">
                        ${q.options.map((opt, i) => `
                            <button class="quiz-option" data-index="${i}" onclick="Trivia.answerQuestion(${i})">
                                <strong>${String.fromCharCode(65 + i)}.</strong> ${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div class="quiz-explanation" id="quizExplanation">
                        <p><strong>Explanation:</strong> ${q.explanation}</p>
                    </div>
                    <button class="btn btn-primary quiz-next" id="quizNext" onclick="Trivia.nextQuestion()">
                        ${state.currentIndex < state.total - 1 ? 'Next Question →' : 'See Results'}
                    </button>
                </div>
            </div>
        `;
    },

    answerQuestion(selected) {
        if (this.quizState.answered) return;
        this.quizState.answered = true;

        const q = this.quizState.questions[this.quizState.currentIndex];
        const options = document.querySelectorAll('.quiz-option');
        
        options.forEach((opt, i) => {
            opt.style.pointerEvents = 'none';
            if (i === q.correct) {
                opt.classList.add('correct');
            }
            if (i === selected && i !== q.correct) {
                opt.classList.add('incorrect');
            }
        });

        if (selected === q.correct) {
            this.quizState.score++;
            this.quizState.results.push(true);
        } else {
            this.quizState.results.push(false);
        }

        document.getElementById('quizExplanation').classList.add('show');
        document.getElementById('quizNext').classList.add('show');
    },

    nextQuestion() {
        this.quizState.currentIndex++;
        this.quizState.answered = false;

        if (this.quizState.currentIndex >= this.quizState.total) {
            this.showResults();
        } else {
            this.renderQuestion();
        }
    },

    showResults() {
        const state = this.quizState;
        const pct = Math.round((state.score / state.total) * 100);
        let message;
        if (pct === 100) message = "Perfect score. Exceptional golf knowledge.";
        else if (pct >= 80) message = "Excellent. You really know your golf.";
        else if (pct >= 60) message = "Good work. Your golf knowledge is solid.";
        else if (pct >= 40) message = "A useful baseline with room to improve.";
        else message = "Review the explanations, then take another run.";

        const container = document.getElementById('triviaContent');
        if (!container) return;
        container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-card quiz-results">
                    <h2>Quiz Complete!</h2>
                    <div class="result-circle">
                        <span>${state.score}/${state.total}</span>
                        <span class="result-label">${pct}%</span>
                    </div>
                    <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">${message}</p>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">
                        You scored ${state.score} out of ${state.total} questions correctly.
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="Trivia.startQuiz()">Play Again</button>
                        <button class="btn btn-secondary" onclick="App.navigate('learn')">Learn More</button>
                    </div>
                    
                    <div style="margin-top: 32px; text-align: left;">
                        <h4 style="margin-bottom: 12px;">Question Review</h4>
                        ${state.questions.map((q, i) => `
                            <div style="padding: 10px; margin-bottom: 8px; background: var(--bg-secondary); border-radius: var(--radius-sm); border-left: 3px solid ${state.results[i] ? 'var(--success)' : 'var(--danger)'};">
                                <p style="font-size: 0.85rem; font-weight: 600;">${state.results[i] ? 'Correct' : 'Review'} · ${i + 1}. ${q.q}</p>
                                <p style="font-size: 0.8rem; color: var(--success); margin-top: 4px;">Answer: ${q.options[q.correct]}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    /* ── Fun Facts ──────────────────────────────────────── */
    renderFacts() {
        // Fisher-Yates shuffle for unbiased randomization
        const shuffled = [...this.funFacts];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return `
            <div class="caddie-panel">
                <h2 style="margin-bottom: 8px;">Golf Facts</h2>
                <p class="panel-desc">Fascinating facts that will make you the most interesting person at the 19th hole!</p>
                <button class="btn btn-ghost mb-3" onclick="Trivia.render('facts')">Shuffle Facts</button>
                <div class="facts-container">
                    ${shuffled.map((fact, index) => `
                        <div class="fact-card">
                            <div class="fact-icon">${String(index + 1).padStart(2, '0')}</div>
                            <div class="fact-title">${fact.title}</div>
                            <div class="fact-text">${fact.text}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /* ── Records ────────────────────────────────────────── */
    renderRecords() {
        return `
            <div class="caddie-panel">
                <h2 style="margin-bottom: 8px;">Golf Records & Milestones</h2>
                <p class="panel-desc">The most incredible achievements in the history of golf</p>
                
                <div class="records-grid">
                    ${GolfData.records.map(r => `
                        <div class="record-card">
                            <div class="record-value">${r.value}</div>
                            <div class="record-desc">${r.record}</div>
                            <div class="record-holder">${r.holder}</div>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; font-style: italic;">${r.detail}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 32px; padding: 24px; background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <h3 style="margin-bottom: 16px;">Golf By The Numbers</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">66.6M</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Golfers worldwide</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">38,081</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Golf courses worldwide</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">16,101</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Courses in the USA</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">~100</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Avg score for amateur men</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">300-500</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Dimples on a golf ball</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 2rem; font-weight: 900; color: var(--green-600); font-family: 'Playfair Display', serif;">4.25"</div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary);">Diameter of the hole</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
