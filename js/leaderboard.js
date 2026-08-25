/* =========================================================
   CourseCompass — Leaderboard Module
   Current game leaderboard, PGA/LPGA tour standings
   ========================================================= */

const Leaderboard = {

    currentTab: 'my-game',

    init() {
        this.bindTabs();
        this.render('my-game');
    },

    bindTabs() {
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.leaderboard-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.lb;
                this.render(this.currentTab);
            });
        });
    },

    render(tab) {
        const container = document.getElementById('leaderboardContent');
        if (!container) return;
        switch (tab) {
            case 'my-game':  container.innerHTML = this.renderMyGame(); break;
            case 'pga-tour': container.innerHTML = this.renderPGA(); break;
            case 'lpga-tour': container.innerHTML = this.renderLPGA(); break;
            case 'majors':   container.innerHTML = this.renderMajors(); break;
        }
    },

    renderProvenance(type = 'reference') {
        if (type === 'device') return `<div class="data-provenance is-live"><span class="data-status">Device live</span><div><strong>Active scorecard</strong><small>Updates immediately from scores stored on this device and synchronized group data when connected.</small></div></div>`;
        if (type === 'history') return `<div class="data-provenance"><span class="data-status">Historical</span><div><strong>Static reference</strong><small>Career records are reference data, not a live tournament feed.</small></div></div>`;
        return `<div class="data-provenance is-reference"><span class="data-status">Reference data</span><div><strong>Demonstration dataset</strong><small>Scores, schedules, purses, and statuses shown here are bundled examples—not a live PGA or LPGA feed. Verify official tour sources for current results.</small></div></div>`;
    },

    /* ── My Game Leaderboard ────────────────────────────── */
    renderMyGame() {
        const players = Scoring.players;
        if (!players || players.length === 0) {
            return `
                <div class="caddie-panel text-center">
                    <h2>Your Game Leaderboard</h2>
                    <p class="panel-desc">Start a round in the Scoring section to see your live leaderboard here!</p>
                    ${this.renderProvenance('device')}
                    <div class="professional-empty-state">
                        <span class="empty-state-code">ROUND</span>
                        <h3>No Active Round</h3>
                        <p style="color: var(--text-secondary); margin-top: 8px; margin-bottom: 24px;">Head to the Scoring tab to start tracking a round, then come back here to see the live standings.</p>
                        <button class="btn btn-primary" onclick="App.navigate('scoring')">Go to Scoring</button>
                    </div>
                </div>
            `;
        }

        // Build standings from current scores
        const course = Scoring.course;
        const holes = Scoring.getCourseHoles();
        const standings = players.map(p => {
            let total = 0, playedPar = 0, holesPlayed = 0;
            holes.forEach(hole => {
                const score = Scoring.scores[p.id]?.[hole.hole];
                if (score !== null && score !== undefined) {
                    total += score;
                    playedPar += hole.par;
                    holesPlayed++;
                }
            });
            const diff = total - playedPar;
            return { ...p, total, playedPar, holesPlayed, diff };
        }).sort((a, b) => {
            if (a.holesPlayed === 0 && b.holesPlayed === 0) return 0;
            if (a.holesPlayed === 0) return 1;
            if (b.holesPlayed === 0) return -1;
            return a.diff - b.diff;
        });

        // Assign positions
        standings.forEach((s, i) => {
            if (i === 0 || s.diff !== standings[i - 1]?.diff) {
                s.pos = i + 1;
            } else {
                s.pos = standings[i - 1].pos;
            }
        });

        return `
            <div class="caddie-panel">
                <h2>Live Game Leaderboard</h2>
                <p class="panel-desc">${course.name} — Updated in real-time as scores are entered</p>
                ${this.renderProvenance('device')}
                
                <div class="lb-table-wrapper">
                    <table class="lb-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Player</th>
                                <th>Thru</th>
                                <th>Thru Par</th>
                                <th>To Par</th>
                                <th>Gross</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${standings.map((s, i) => `
                                <tr class="${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}">
                                    <td>
                                        ${i < 3 ? `<span class="rank-marker">${String(i + 1).padStart(2, '0')}</span>` : ''}
                                        ${s.pos}
                                    </td>
                                    <td style="font-weight: 700; color: ${esc(s.color)};">${esc(s.name)}</td>
                                    <td>${s.holesPlayed > 0 ? (s.holesPlayed === holes.length ? 'F' : s.holesPlayed) : '—'}</td>
                                    <td>${s.holesPlayed > 0 ? s.playedPar : '—'}</td>
                                    <td class="${s.diff < 0 ? 'lb-score-under' : s.diff > 0 ? 'lb-score-over' : 'lb-score-even'}">
                                        ${s.holesPlayed > 0 ? (s.diff === 0 ? 'E' : s.diff > 0 ? `+${s.diff}` : s.diff) : '—'}
                                    </td>
                                    <td style="font-weight: 700;">${s.holesPlayed > 0 ? s.total : '—'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 16px; text-align: center;">
                    <button class="btn btn-ghost" onclick="Leaderboard.render('my-game')">Refresh</button>
                    <button class="btn btn-ghost" onclick="App.navigate('scoring')">Edit Scores</button>
                </div>
            </div>
        `;
    },

    /* ── PGA Tour Leaderboard ───────────────────────────── */
    renderPGA() {
        const event = GolfData.pgaTournaments.find(t => t.status === 'completed');
        const lb = GolfData.pgaLeaderboard;

        return `
            <div class="caddie-panel">
                <h2>PGA Tour Leaderboard</h2>
                <p class="panel-desc">Tournament-format reference data and upcoming-event examples</p>
                ${this.renderProvenance('reference')}
                
                ${event ? `
                    <div class="event-info">
                        <div class="event-info-card">
                            <div class="event-label">Tournament</div>
                            <div class="event-value">${event.name}</div>
                        </div>
                        <div class="event-info-card">
                            <div class="event-label">Course</div>
                            <div class="event-value">${event.course}</div>
                        </div>
                        <div class="event-info-card">
                            <div class="event-label">Purse</div>
                            <div class="event-value">${event.purse}</div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="lb-table-wrapper">
                    <table class="lb-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Player</th>
                                <th>Score</th>
                                <th>Today</th>
                                <th>Thru</th>
                                <th>R1</th>
                                <th>R2</th>
                                <th>R3</th>
                                <th>R4</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lb.map((p, i) => `
                                <tr class="${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}">
                                    <td>
                                        ${i < 3 ? `<span class="rank-marker">${String(i + 1).padStart(2, '0')}</span>` : ''}
                                        ${p.pos}
                                    </td>
                                    <td style="font-weight: 600;">
                                        <span class="lb-flag">${p.country}</span>${p.name}
                                    </td>
                                    <td class="${p.score < 0 ? 'lb-score-under' : p.score > 0 ? 'lb-score-over' : 'lb-score-even'}">
                                        ${p.score === 0 ? 'E' : p.score > 0 ? `+${p.score}` : p.score}
                                    </td>
                                    <td class="${p.today < 0 ? 'lb-score-under' : p.today > 0 ? 'lb-score-over' : 'lb-score-even'}">
                                        ${p.today === 0 ? 'E' : p.today > 0 ? `+${p.today}` : p.today}
                                    </td>
                                    <td>${p.thru}</td>
                                    ${p.rounds.map(r => `<td>${r}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h3 class="module-subheading">Upcoming PGA Tour Events</h3>
                <div style="display: grid; gap: 12px;">
                    ${GolfData.pgaTournaments.filter(t => t.status === 'upcoming').map(t => `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <h4 style="font-size: 1rem;">${t.name}</h4>
                                <p style="font-size: 0.85rem; color: var(--text-secondary);">${t.course} — ${t.location}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 0.9rem;">${t.dates}</div>
                                <div style="font-size: 0.8rem; color: var(--gold-500); font-weight: 600;">Purse: ${t.purse}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /* ── LPGA Tour Leaderboard ──────────────────────────── */
    renderLPGA() {
        const lb = GolfData.lpgaLeaderboard;

        return `
            <div class="caddie-panel">
                <h2>LPGA Tour Leaderboard</h2>
                <p class="panel-desc">Tournament-format reference data and upcoming-event examples</p>
                ${this.renderProvenance('reference')}
                
                <div class="event-info">
                    <div class="event-info-card">
                        <div class="event-label">Featured Tour</div>
                        <div class="event-value">LPGA Tour 2026</div>
                    </div>
                    <div class="event-info-card">
                        <div class="event-label">Next Major</div>
                        <div class="event-value">Chevron Championship</div>
                    </div>
                    <div class="event-info-card">
                        <div class="event-label">Season Events</div>
                        <div class="event-value">34 Tournaments</div>
                    </div>
                </div>
                
                <div class="lb-table-wrapper">
                    <table class="lb-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Player</th>
                                <th>Score</th>
                                <th>Today</th>
                                <th>Thru</th>
                                <th>R1</th>
                                <th>R2</th>
                                <th>R3</th>
                                <th>R4</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lb.map((p, i) => `
                                <tr class="${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}">
                                    <td>
                                        ${i < 3 ? `<span class="rank-marker">${String(i + 1).padStart(2, '0')}</span>` : ''}
                                        ${p.pos}
                                    </td>
                                    <td style="font-weight: 600;">
                                        <span class="lb-flag">${p.country}</span>${p.name}
                                    </td>
                                    <td class="${p.score < 0 ? 'lb-score-under' : p.score > 0 ? 'lb-score-over' : 'lb-score-even'}">
                                        ${p.score === 0 ? 'E' : p.score > 0 ? `+${p.score}` : p.score}
                                    </td>
                                    <td class="${p.today < 0 ? 'lb-score-under' : p.today > 0 ? 'lb-score-over' : 'lb-score-even'}">
                                        ${p.today === 0 ? 'E' : p.today > 0 ? `+${p.today}` : p.today}
                                    </td>
                                    <td>${p.thru}</td>
                                    ${p.rounds.map(r => `<td>${r}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h3 class="module-subheading">Upcoming LPGA Tour Events</h3>
                <div style="display: grid; gap: 12px;">
                    ${GolfData.lpgaTournaments.map(t => `
                        <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                            <div>
                                <h4 style="font-size: 1rem;">${t.name}</h4>
                                <p style="font-size: 0.85rem; color: var(--text-secondary);">${t.course} — ${t.location}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 0.9rem;">${t.dates}</div>
                                <div style="font-size: 0.8rem; color: var(--gold-500); font-weight: 600;">Purse: ${t.purse}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /* ── Major Championships ────────────────────────────── */
    renderMajors() {
        const mensMajors = GolfData.pgaTournaments.filter(t => 
            ['The Masters', 'PGA Championship', 'U.S. Open', 'The Open Championship'].includes(t.name)
        );
        const womensMajors = GolfData.lpgaTournaments.filter(t => 
            ['Chevron Championship', "U.S. Women's Open", "Women's PGA Championship", 'The Evian Championship', "AIG Women's Open"].includes(t.name)
        );

        return `
            <div class="caddie-panel">
                <h2>Major Championships 2026</h2>
                <p class="panel-desc">The most prestigious tournaments in professional golf</p>
                ${this.renderProvenance('reference')}
                
                <h3 class="module-subheading first">Men's Majors</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">
                    The four men's majors are the most important tournaments of the year. Winning a major 
                    is the highest achievement in professional golf. A player who wins all four at least once 
                    achieves the "Career Grand Slam."
                </p>
                <div style="display: grid; gap: 16px; margin-bottom: 32px;">
                    ${mensMajors.map((t, i) => {
                        const icons = ['01', '02', '03', '04'];
                        const descriptions = [
                            'The most prestigious tournament in golf. Played at Augusta National every April since 1934. The winner receives the famous Green Jacket.',
                            'The PGA of America\'s flagship event. Traditionally the strongest field of any major with the most PGA professionals.',
                            'America\'s national championship. Known for brutal course setups and the toughest conditions in golf. "The ultimate test of golf."',
                            'The oldest major championship, first played in 1860. Always played on a links course in the UK. The champion receives the Claret Jug.'
                        ];
                        return `
                            <div class="card" style="border-left: 4px solid var(--green-500);">
                                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
                                    <div>
                                        <h4 style="font-size: 1.1rem;">${icons[i]} ${t.name}</h4>
                                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${t.course} — ${t.location}</p>
                                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.6;">${descriptions[i]}</p>
                                    </div>
                                    <div style="text-align: right; flex-shrink: 0;">
                                        <div style="font-weight: 700;">${t.dates}</div>
                                        <div style="font-size: 0.85rem; color: var(--gold-500); font-weight: 600;">Purse: ${t.purse}</div>
                                        <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; background: ${t.status === 'upcoming' ? 'var(--green-100)' : 'var(--bg-tertiary)'}; color: ${t.status === 'upcoming' ? 'var(--green-700)' : 'var(--text-muted)'};">
                                            ${t.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <h3 class="module-subheading first">Women's Majors</h3>
                <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">
                    The LPGA Tour has five major championships. These tournaments carry the most prestige 
                    and the largest purses in women's professional golf.
                </p>
                <div style="display: grid; gap: 16px;">
                    ${womensMajors.map(t => `
                        <div class="card" style="border-left: 4px solid var(--gold-500);">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                <div>
                                    <h4 style="font-size: 1.05rem;">${t.name}</h4>
                                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${t.course} — ${t.location}</p>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 700; font-size: 0.9rem;">${t.dates}</div>
                                    <div style="font-size: 0.8rem; color: var(--gold-500); font-weight: 600;">Purse: ${t.purse}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 32px; padding: 20px; background: var(--bg-secondary); border-radius: var(--radius-lg);">
                    <h4 style="margin-bottom: 12px;">All-Time Major Championship Leaders (Men)</h4>
                    ${this.renderProvenance('history')}
                    <div class="lb-table-wrapper">
                    <table class="major-leaders-table" style="width: 100%; font-size: 0.9rem;">
                        <tr style="font-weight: 700; border-bottom: 2px solid var(--border-color);">
                            <td style="padding: 8px;">Rank</td>
                            <td>Player</td>
                            <td>Majors</td>
                            <td>Masters</td>
                            <td>PGA</td>
                            <td>US Open</td>
                            <td>Open</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color); background: rgba(212,160,23,0.1);">
                            <td style="padding: 8px;">1</td><td style="font-weight: 700;">Jack Nicklaus</td><td style="font-weight: 900; color: var(--gold-500);">18</td><td>6</td><td>5</td><td>4</td><td>3</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px;">2</td><td style="font-weight: 700;">Tiger Woods</td><td style="font-weight: 900; color: var(--gold-500);">15</td><td>5</td><td>4</td><td>3</td><td>3</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px;">3</td><td style="font-weight: 700;">Walter Hagen</td><td style="font-weight: 900;">11</td><td>0</td><td>5</td><td>2</td><td>4</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px;">4</td><td style="font-weight: 700;">Ben Hogan</td><td style="font-weight: 900;">9</td><td>2</td><td>2</td><td>4</td><td>1</td>
                        </tr>
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 8px;">5</td><td style="font-weight: 700;">Gary Player</td><td style="font-weight: 900;">9</td><td>3</td><td>2</td><td>1</td><td>3</td>
                        </tr>
                    </table>
                    </div>
                </div>

                <div class="major-leaders-card">
                    <h4>All-Time Major Championship Leaders (Women)</h4>
                    <p class="major-leaders-note">LPGA-recognized major totals span different championship eras, so historical events are included.</p>
                    <div class="lb-table-wrapper">
                        <table class="major-leaders-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Majors</th>
                                    <th>Historical distinction</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="pos-1">
                                    <td>1</td><td><strong>Patty Berg</strong></td><td class="major-total">15</td><td>7 Titleholders, 7 Women's Western Opens, 1 U.S. Women's Open</td>
                                </tr>
                                <tr class="pos-2">
                                    <td>2</td><td><strong>Mickey Wright</strong></td><td class="major-total">13</td><td>Career Grand Slam champion</td>
                                </tr>
                                <tr class="pos-3">
                                    <td>3</td><td><strong>Louise Suggs</strong></td><td class="major-total">11</td><td>Career Grand Slam champion</td>
                                </tr>
                                <tr>
                                    <td>T4</td><td><strong>Babe Zaharias</strong></td><td class="major-total">10</td><td>Won every major contested in 1950</td>
                                </tr>
                                <tr>
                                    <td>T4</td><td><strong>Annika Sörenstam</strong></td><td class="major-total">10</td><td>Career Grand Slam champion</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
};
