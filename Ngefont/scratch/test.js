import { FontFlux } from 'font-flux-js';
const f = FontFlux.create({family:'Test'});
f.addGlyph({name:'A', unicode:65, contours:[]});
console.log(f.export({format:'woff'}) ? "Success" : "Failed");
