const fs = require('node:fs');
const path = require('node:path');
const directory = path.join(__dirname, 'data');
const read = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const data = { cards: read('cards.json').cards, recipes: read('merges.json').recipes };
fs.writeFileSync(path.join(directory, 'runtime.js'), '// Generated from cards.json and merges.json. Regenerate after data edits.\nwindow.CARDBATTLER_DATA = ' + JSON.stringify(data) + ';\n');
console.log(`Bundled ${data.cards.length} cards and ${data.recipes.length} recipes.`);
