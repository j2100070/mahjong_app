import { calculate, stringToTile, HandInput, Meld } from '../index';
import { parseHand } from '../handParser';

const input: HandInput = {
  tiles: ['2m','3m','4m','5p','6p','7p','2p','2p'].map(stringToTile),
  agariTile: stringToTile('7p'),
  calledMelds: [{
    type: 'koutsu' as const,
    tiles: ['3s','3s','3s'].map(stringToTile),
    isOpen: true,
    callType: 'pon' as const,
  }],
};

console.log('Tiles:', input.tiles);
console.log('Called:', input.calledMelds);
const parsed = parseHand(input);
console.log('Parsed count:', parsed.length);
for (const p of parsed) {
  console.log('Parse:', JSON.stringify(p));
}
