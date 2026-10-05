const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, 'data');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const source = read('cards.json');
const enemyData=read('enemies.json');
const data = { enemies:enemyData.enemies, enemySummons:enemyData.summons, cards: source.cards, colorPalette: source.colorPalette, recipes: read('merges.json').recipes };
fs.writeFileSync(path.join(directory, 'runtime.js'), '// Generated from cards.json, merges.json, and enemies.json. Regenerate after data edits.\nwindow.CARDBATTLER_DATA = ' + JSON.stringify(data) + ';\n');
const { Game } = require('./engine.js');
const game = new Game(data);
const descriptions = { schemaVersion: 1, generatedFrom: ['engine.js', 'cards.json'], cards: game.playable().map(card => {
  const profile = game.profile(card.id);
  return { id: card.id, name: card.name, description: profile.description, abilityPending: profile.pendingAbility, keywords: profile.keywords.map(id => ({ id, description: profile.keywordDescriptions[id] || null, pending: profile.pendingKeywords.includes(id) })), prototypeStats: { health: profile.health, attack: profile.attack, armor: profile.armor, range: profile.range, goldPrice: profile.price } };
}) };
fs.writeFileSync(path.join(directory, 'implemented-abilities.json'), JSON.stringify(descriptions, null, 2) + '\n');
console.log(`Bundled ${data.cards.length} player cards, ${data.recipes.length} recipes, and ${data.enemies.length} enemies.`);
