// games-config.js — single source of truth for all arcade score tables.
// Used by tournament.html, prize.html, nft-leaderboard.html, dashboard, and
// the Monshi bot. When you add a new game, add its scores_ table here only.

(function(global){
  global.MONSHI_GAMES = {
    // Every score table that should count toward leaderboards/tournaments.
    // Order doesn't matter for aggregation, but keep grouped for readability.
    ALL_SCORE_TABLES: [
      // Legacy / runner
      'scores',
      'scores_shooter',
      'scores_racer',
      'scores_flappy',
      'scores_snake',
      'scores_breaker',
      'scores_pump',
      'scores_flip',
      'scores_whack',
      'scores_2048',
      'scores_slots',
      'scores_memory',
      'scores_plinko',
      'scores_rug',
      'scores_wordle',
      'scores_tetris',
      'scores_c4',
      'scores_trivia',
      'scores_mine',
      'scores_bj',
      'scores_whale',
      'scores_trade',
      // Newer per-game tables
      'scores_pong',
      'scores_heist',
      'scores_coin',
      'scores_rugscan',
      // $RENE arcade games
      'scores_rene_run',
      'scores_rene_pump',
      'scores_rene_gym'
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
